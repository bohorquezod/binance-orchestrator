import { binanceProxyService } from './binance-proxy.service';
import { binanceDbService } from './binance-db.service';
import { logger } from '@utils/logger';
import type { DepositResponse, WithdrawResponse } from '@/types/binance-proxy.types';
import type { TransactionInput } from '@/types/orchestrator.types';

/**
 * Result of a sync job execution
 */
export interface SyncJobResult {
  syncJobId: number;
  jobType: 'deposit' | 'withdraw';
  startTime: number;
  endTime: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsDuplicated: number;
  recordsFailed: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  nextStartTime?: number;
}

/**
 * Options for syncing deposits
 */
export interface SyncDepositsOptions {
  appUserId: string;
  apiKey: string;
  startTime?: number;
  endTime?: number;
  binanceUserId?: string;
}

/**
 * Options for syncing withdrawals
 */
export interface SyncWithdrawalsOptions {
  appUserId: string;
  apiKey: string;
  startTime?: number;
  endTime?: number;
  binanceUserId?: string;
}

/**
 * Service for synchronizing transactions from Binance API
 */
export class BinanceSyncService {
  private readonly CHUNK_SIZE_DAYS = 7;
  private readonly MAX_RECORDS_PER_REQUEST = 1000;
  private readonly INITIAL_SYNC_DAYS = 90;

  /**
   * Calculates the time range for synchronization
   * @param jobType Job type (deposit or withdraw)
   * @param forceStartTime Optional forced start time
   * @param forceEndTime Optional forced end time
   * @returns Time range with startTime and endTime
   */
  async calculateTimeRange(
    jobType: 'deposit' | 'withdraw',
    forceStartTime?: number,
    forceEndTime?: number
  ): Promise<{ startTime: number; endTime: number }> {
    // If forced times are provided, use them
    if (forceStartTime !== undefined && forceEndTime !== undefined) {
      return { startTime: forceStartTime, endTime: forceEndTime };
    }

    // Try to get next time range from API
    try {
      const timeRange = await binanceDbService.getNextTimeRange(jobType);
      return timeRange;
    } catch (error) {
      logger.warn('Failed to get next time range from API, using default', { jobType, error: (error as Error).message });
      
      // Fallback: check last successful sync job
      const lastJob = await binanceDbService.getLastSuccessfulSyncJob(jobType);
      
      if (lastJob && typeof lastJob === 'object' && 'nextStartTime' in lastJob) {
        const nextStartTime = (lastJob as { nextStartTime: number }).nextStartTime;
        return {
          startTime: nextStartTime,
          endTime: Date.now(),
        };
      }

      // First execution: sync from 90 days ago
      const endTime = forceEndTime || Date.now();
      const startTime = forceStartTime || (endTime - this.INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000);
      
      return { startTime, endTime };
    }
  }

  /**
   * Transforms a deposit response to TransactionInput format
   * @param deposit Deposit response from Binance
   * @param appUserId Application user ID
   * @param binanceUserId Binance user ID (required)
   * @returns TransactionInput
   */
  transformDepositToTransaction(
    deposit: DepositResponse,
    appUserId: string,
    binanceUserId: string
  ): TransactionInput {
    // Only process successful deposits (status === 1)
    if (deposit.status !== 1) {
      throw new Error(`Deposit has non-success status: ${deposit.status}`);
    }

    // Determine account based on transferType
    // transferType: 0 = internal transfer, 1 = external deposit
    const account = deposit.transferType === 0 ? 'Spot' : 'Funding';

    // Build remark with address and txId
    const remarkParts: string[] = [];
    if (deposit.address) {
      remarkParts.push(`Address: ${deposit.address}`);
    }
    if (deposit.txId) {
      remarkParts.push(`TxID: ${deposit.txId}`);
    }
    const remark = remarkParts.length > 0 ? remarkParts.join(', ') : null;

    // Build raw payload
    const raw: Record<string, unknown> = {
      network: deposit.network,
      addressTag: deposit.addressTag,
      txId: deposit.txId,
      transferType: deposit.transferType,
      unlockConfirm: deposit.unlockConfirm,
      confirmTimes: deposit.confirmTimes,
    };

    return {
      appUserId,
      binanceUserId,
      utcTime: new Date(deposit.insertTime),
      account,
      operation: 'deposit',
      coin: deposit.coin,
      change: deposit.amount,
      remark,
      raw,
    };
  }

  /**
   * Transforms a withdrawal response to TransactionInput format
   * @param withdrawal Withdrawal response from Binance
   * @param appUserId Application user ID
   * @param binanceUserId Binance user ID (required)
   * @returns TransactionInput
   */
  transformWithdrawalToTransaction(
    withdrawal: WithdrawResponse,
    appUserId: string,
    binanceUserId: string
  ): TransactionInput {
    // Determine account based on transferType
    const account = withdrawal.transferType === 0 ? 'Spot' : 'Funding';

    // Build remark with address, txId, and fee
    const remarkParts: string[] = [];
    if (withdrawal.address) {
      remarkParts.push(`Address: ${withdrawal.address}`);
    }
    if (withdrawal.txId) {
      remarkParts.push(`TxID: ${withdrawal.txId}`);
    }
    if (withdrawal.transactionFee) {
      remarkParts.push(`Fee: ${withdrawal.transactionFee}`);
    }
    const remark = remarkParts.length > 0 ? remarkParts.join(', ') : null;

    // Use completeTime if available, otherwise applyTime
    const timeString = withdrawal.completeTime || withdrawal.applyTime;
    const utcTime = new Date(timeString);

    // Build raw payload
    const raw: Record<string, unknown> = {
      id: withdrawal.id,
      transactionFee: withdrawal.transactionFee,
      status: withdrawal.status,
      addressTag: withdrawal.addressTag,
      txId: withdrawal.txId,
      network: withdrawal.network,
      transferType: withdrawal.transferType,
      info: withdrawal.info,
      confirmNo: withdrawal.confirmNo,
      walletType: withdrawal.walletType,
      txKey: withdrawal.txKey,
    };

    // For withdrawals, change should be negative
    const change = `-${withdrawal.amount}`;

    return {
      appUserId,
      binanceUserId,
      utcTime,
      account,
      operation: 'withdraw',
      coin: withdrawal.coin,
      change,
      remark,
      raw,
    };
  }

  /**
   * Divides a time range into chunks of maximum size
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Array of time range chunks
   */
  private divideTimeRangeIntoChunks(startTime: number, endTime: number): Array<{ startTime: number; endTime: number }> {
    const chunks: Array<{ startTime: number; endTime: number }> = [];
    const chunkSizeMs = this.CHUNK_SIZE_DAYS * 24 * 60 * 60 * 1000;
    
    let currentStart = startTime;
    
    while (currentStart < endTime) {
      const currentEnd = Math.min(currentStart + chunkSizeMs, endTime);
      chunks.push({ startTime: currentStart, endTime: currentEnd });
      currentStart = currentEnd + 1; // +1ms to avoid overlap
    }
    
    return chunks;
  }

  /**
   * Synchronizes deposits from Binance API
   * @param options Sync options
   * @returns Sync job result
   */
  async syncDeposits(options: SyncDepositsOptions): Promise<SyncJobResult> {
    const { appUserId, apiKey, binanceUserId } = options;

    if (!binanceUserId) {
      throw new Error('binanceUserId is required for syncing deposits');
    }

    let syncJobId: number | null = null;
    let totalRecordsProcessed = 0;
    let totalRecordsInserted = 0;
    let totalRecordsDuplicated = 0;
    let totalRecordsFailed = 0;
    let finalStatus: 'success' | 'failed' | 'partial' = 'success';
    let errorMessage: string | undefined;

    try {
      // Calculate time range
      const timeRange = await this.calculateTimeRange('deposit', options.startTime, options.endTime);
      const { startTime, endTime } = timeRange;

      logger.info('Starting deposit sync', { startTime, endTime, appUserId });

      // Divide into chunks if range is too large
      const chunks = this.divideTimeRangeIntoChunks(startTime, endTime);
      logger.info('Divided time range into chunks', { chunkCount: chunks.length });

      // Create sync job record
      const syncJob = await binanceDbService.createSyncJob({
        jobType: 'deposit',
        startTime,
        endTime,
        status: 'partial', // Will be updated at the end
      });
      syncJobId = (syncJob as { id: number })?.id;
      if (!syncJobId) {
        throw new Error('Failed to create sync job record');
      }

      // Process each chunk
      for (const chunk of chunks) {
        logger.info('Processing deposit chunk', { chunk, syncJobId });

        let chunkStartTime = chunk.startTime;
        let hasMoreRecords = true;

        while (hasMoreRecords) {
          // Fetch deposits from Binance
          const deposits = await binanceProxyService.getDepositHistory({
            startTime: chunkStartTime,
            endTime: chunk.endTime,
            limit: this.MAX_RECORDS_PER_REQUEST,
            status: 1, // Only successful deposits
            apiKey,
          }) as DepositResponse[];

          if (!Array.isArray(deposits) || deposits.length === 0) {
            hasMoreRecords = false;
            break;
          }

          logger.info('Fetched deposits from Binance', { count: deposits.length, syncJobId });

          // Transform deposits to transactions
          const transactions: TransactionInput[] = [];
          const failedTransforms: number[] = [];

          for (let i = 0; i < deposits.length; i++) {
            try {
              const transaction = this.transformDepositToTransaction(deposits[i], appUserId, binanceUserId);
              transactions.push(transaction);
            } catch (error) {
              logger.warn('Failed to transform deposit', { index: i, error: (error as Error).message });
              failedTransforms.push(i);
            }
          }

          // Save transactions in bulk
          if (transactions.length > 0) {
            try {
              const bulkResult = await binanceDbService.saveBulkData(transactions, {
                source: 'cronjob-binance',
                appUserId,
              }) as {
                inserted?: number;
                duplicated?: number;
                failed?: number;
              };

              totalRecordsProcessed += deposits.length;
              totalRecordsInserted += bulkResult.inserted || 0;
              totalRecordsDuplicated += bulkResult.duplicated || 0;
              totalRecordsFailed += (bulkResult.failed || 0) + failedTransforms.length;

              logger.info('Saved deposit transactions', {
                syncJobId,
                inserted: bulkResult.inserted,
                duplicated: bulkResult.duplicated,
                failed: bulkResult.failed,
              });
            } catch (error) {
              logger.error('Failed to save deposit transactions', { syncJobId, error: (error as Error).message });
              totalRecordsFailed += transactions.length;
              finalStatus = 'partial';
            }
          } else {
            totalRecordsFailed += deposits.length;
          }

          // If we got the maximum records, there might be more
          if (deposits.length === this.MAX_RECORDS_PER_REQUEST) {
            // Continue from the last deposit's insertTime + 1ms
            const lastDeposit = deposits[deposits.length - 1];
            chunkStartTime = lastDeposit.insertTime + 1;
            hasMoreRecords = true;
          } else {
            hasMoreRecords = false;
          }
        }
      }

      // Calculate next start time (endTime + 1ms to avoid overlap)
      const nextStartTime = endTime + 1;

      // Update sync job with final results
      finalStatus = totalRecordsFailed === 0 ? 'success' : totalRecordsProcessed > 0 ? 'partial' : 'failed';
      
      await binanceDbService.updateSyncJob(syncJobId, {
        status: finalStatus,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
        nextStartTime,
      });

      logger.info('Completed deposit sync', {
        syncJobId,
        status: finalStatus,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
      });

      return {
        syncJobId,
        jobType: 'deposit',
        startTime,
        endTime,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
        status: finalStatus,
        nextStartTime,
      };
    } catch (error) {
      const err = error as Error;
      errorMessage = err.message;
      finalStatus = 'failed';

      logger.error('Error in deposit sync', { syncJobId, error: err.message });

      // Update sync job with error
      if (syncJobId !== null) {
        try {
          await binanceDbService.updateSyncJob(syncJobId, {
            status: 'failed',
            errorMessage: err.message,
          });
        } catch (updateError) {
          logger.error('Failed to update sync job with error', { syncJobId, error: (updateError as Error).message });
        }
      }

      throw err;
    }
  }

  /**
   * Synchronizes withdrawals from Binance API
   * @param options Sync options
   * @returns Sync job result
   */
  async syncWithdrawals(options: SyncWithdrawalsOptions): Promise<SyncJobResult> {
    const { appUserId, apiKey, binanceUserId } = options;

    if (!binanceUserId) {
      throw new Error('binanceUserId is required for syncing withdrawals');
    }

    let syncJobId: number | null = null;
    let totalRecordsProcessed = 0;
    let totalRecordsInserted = 0;
    let totalRecordsDuplicated = 0;
    let totalRecordsFailed = 0;
    let finalStatus: 'success' | 'failed' | 'partial' = 'success';
    let errorMessage: string | undefined;

    try {
      // Calculate time range
      const timeRange = await this.calculateTimeRange('withdraw', options.startTime, options.endTime);
      const { startTime, endTime } = timeRange;

      logger.info('Starting withdrawal sync', { startTime, endTime, appUserId });

      // Divide into chunks if range is too large
      const chunks = this.divideTimeRangeIntoChunks(startTime, endTime);
      logger.info('Divided time range into chunks', { chunkCount: chunks.length });

      // Create sync job record
      const syncJob = await binanceDbService.createSyncJob({
        jobType: 'withdraw',
        startTime,
        endTime,
        status: 'partial', // Will be updated at the end
      });
      syncJobId = (syncJob as { id: number })?.id;
      if (!syncJobId) {
        throw new Error('Failed to create sync job record');
      }

      // Process each chunk
      for (const chunk of chunks) {
        logger.info('Processing withdrawal chunk', { chunk, syncJobId });

        let chunkStartTime = chunk.startTime;
        let hasMoreRecords = true;

        while (hasMoreRecords) {
          // Fetch withdrawals from Binance
          const withdrawals = await binanceProxyService.getWithdrawHistory({
            startTime: chunkStartTime,
            endTime: chunk.endTime,
            limit: this.MAX_RECORDS_PER_REQUEST,
            apiKey,
          }) as WithdrawResponse[];

          if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
            hasMoreRecords = false;
            break;
          }

          logger.info('Fetched withdrawals from Binance', { count: withdrawals.length, syncJobId });

          // Transform withdrawals to transactions
          const transactions: TransactionInput[] = [];
          const failedTransforms: number[] = [];

          for (let i = 0; i < withdrawals.length; i++) {
            try {
              const transaction = this.transformWithdrawalToTransaction(withdrawals[i], appUserId, binanceUserId);
              transactions.push(transaction);
            } catch (error) {
              logger.warn('Failed to transform withdrawal', { index: i, error: (error as Error).message });
              failedTransforms.push(i);
            }
          }

          // Save transactions in bulk
          if (transactions.length > 0) {
            try {
              const bulkResult = await binanceDbService.saveBulkData(transactions, {
                source: 'cronjob-binance',
                appUserId,
              }) as {
                inserted?: number;
                duplicated?: number;
                failed?: number;
              };

              totalRecordsProcessed += withdrawals.length;
              totalRecordsInserted += bulkResult.inserted || 0;
              totalRecordsDuplicated += bulkResult.duplicated || 0;
              totalRecordsFailed += (bulkResult.failed || 0) + failedTransforms.length;

              logger.info('Saved withdrawal transactions', {
                syncJobId,
                inserted: bulkResult.inserted,
                duplicated: bulkResult.duplicated,
                failed: bulkResult.failed,
              });
            } catch (error) {
              logger.error('Failed to save withdrawal transactions', { syncJobId, error: (error as Error).message });
              totalRecordsFailed += transactions.length;
              finalStatus = 'partial';
            }
          } else {
            totalRecordsFailed += withdrawals.length;
          }

          // If we got the maximum records, there might be more
          if (withdrawals.length === this.MAX_RECORDS_PER_REQUEST) {
            // Continue from the last withdrawal's completeTime or applyTime + 1ms
            const lastWithdrawal = withdrawals[withdrawals.length - 1];
            const lastTime = lastWithdrawal.completeTime || lastWithdrawal.applyTime;
            const lastTimeMs = new Date(lastTime).getTime();
            chunkStartTime = lastTimeMs + 1;
            hasMoreRecords = true;
          } else {
            hasMoreRecords = false;
          }
        }
      }

      // Calculate next start time (endTime + 1ms to avoid overlap)
      const nextStartTime = endTime + 1;

      // Update sync job with final results
      finalStatus = totalRecordsFailed === 0 ? 'success' : totalRecordsProcessed > 0 ? 'partial' : 'failed';
      
      await binanceDbService.updateSyncJob(syncJobId, {
        status: finalStatus,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
        nextStartTime,
      });

      logger.info('Completed withdrawal sync', {
        syncJobId,
        status: finalStatus,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
      });

      return {
        syncJobId,
        jobType: 'withdraw',
        startTime,
        endTime,
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsDuplicated: totalRecordsDuplicated,
        recordsFailed: totalRecordsFailed,
        status: finalStatus,
        nextStartTime,
      };
    } catch (error) {
      const err = error as Error;
      errorMessage = err.message;
      finalStatus = 'failed';

      logger.error('Error in withdrawal sync', { syncJobId, error: err.message });

      // Update sync job with error
      if (syncJobId !== null) {
        try {
          await binanceDbService.updateSyncJob(syncJobId, {
            status: 'failed',
            errorMessage: err.message,
          });
        } catch (updateError) {
          logger.error('Failed to update sync job with error', { syncJobId, error: (updateError as Error).message });
        }
      }

      throw err;
    }
  }
}

// Export singleton instance
export const binanceSyncService = new BinanceSyncService();

