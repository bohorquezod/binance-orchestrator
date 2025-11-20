import { parse } from 'csv-parse/sync';
import { fileStorageService } from './file-storage.service';
import { binanceDbService } from './binance-db.service';
import { logger } from '@utils/logger';
import type { ParsedCsvData, CsvRow } from '@/types/orchestrator.types';

/**
 * Service for processing CSV files
 */
export class CsvProcessorService {
  /**
   * Parses CSV content into structured data
   * @param csvContent Raw CSV string
   * @returns Parsed CSV data with headers and rows
   */
  async parseCsv(csvContent: string): Promise<ParsedCsvData> {
    try {
      logger.info('Parsing CSV content', { contentLength: csvContent.length });

      const records = parse(csvContent, {
        columns: true, // Use first line as column names
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Try to convert to number if possible
          if (context.header) {
            return value;
          }
          const numValue = Number(value);
          if (!isNaN(numValue) && value.trim() !== '') {
            return numValue;
          }
          return value;
        },
      }) as CsvRow[];

      if (records.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }

      const headers = Object.keys(records[0]);
      
      logger.info('Successfully parsed CSV', { 
        rowCount: records.length, 
        columnCount: headers.length,
        headers 
      });

      return {
        headers,
        rows: records,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Error parsing CSV', { error: err.message });
      throw new Error(`Failed to parse CSV: ${err.message}`);
    }
  }

  /**
   * Transforms CSV data to the format expected by binance-db-api
   * Maps CSV columns to TransactionInput format
   * @param csvData Parsed CSV data
   * @param appUserId Application user ID
   * @param filename CSV filename for source tracking
   * @returns Transformed data ready for database
   */
  async transformToDbFormat(
    csvData: ParsedCsvData,
    appUserId: string,
    filename: string
  ): Promise<Record<string, unknown>[]> {
    try {
      logger.info('Transforming CSV data to DB format', { rowCount: csvData.rows.length });

      const transformed = csvData.rows.map((row) => {
        const record: Record<string, unknown> = {};

        // Map CSV columns to database fields according to Binance CSV format
        // User_ID → binanceUserId (string)
        if (row.User_ID !== undefined) {
          record.binanceUserId = String(row.User_ID);
        }

        // UTC_Time → utcTime (Date, parse date)
        if (row.UTC_Time !== undefined) {
          const dateValue = typeof row.UTC_Time === 'string' 
            ? new Date(row.UTC_Time) 
            : new Date(String(row.UTC_Time));
          if (!isNaN(dateValue.getTime())) {
            record.utcTime = dateValue;
          } else {
            throw new Error(`Invalid UTC_Time value: ${row.UTC_Time}`);
          }
        }

        // Account → account (string)
        if (row.Account !== undefined) {
          record.account = String(row.Account);
        }

        // Operation → operation (string)
        if (row.Operation !== undefined) {
          record.operation = String(row.Operation);
        }

        // Coin → coin (string)
        if (row.Coin !== undefined) {
          record.coin = String(row.Coin);
        }

        // Change → change (string, maintain decimal precision)
        if (row.Change !== undefined) {
          record.change = String(row.Change);
        }

        // Remark → remark (string | null)
        if (row.Remark !== undefined) {
          const remarkValue = String(row.Remark).trim();
          record.remark = remarkValue.length > 0 ? remarkValue : null;
        } else {
          record.remark = null;
        }

        // Include appUserId (required)
        record.appUserId = appUserId;

        // Include source with format csv:{filename}
        record.source = `csv:${filename}`;

        return record;
      });

      logger.info('Successfully transformed CSV data', { recordCount: transformed.length });
      return transformed;
    } catch (error) {
      const err = error as Error;
      logger.error('Error transforming CSV data', { error: err.message });
      throw new Error(`Failed to transform CSV data: ${err.message}`);
    }
  }

  /**
   * Complete flow: Get CSV from file-storage-api, parse it, transform it, and save to binance-db-api
   * @param fileId ID of the CSV file in file-storage-api
   * @param appUserId Application user ID
   * @returns Processing result with detailed statistics
   */
  async processAndSave(
    fileId: string,
    appUserId: string
  ): Promise<{
    csvImportId: number;
    recordsProcessed: number;
    recordsInserted: number;
    recordsDuplicated: number;
    recordsFailed: number;
    success: boolean;
  }> {
    let csvImportId: number | null = null;

    try {
      logger.info('Starting CSV processing flow', { fileId, appUserId });

      // Step 1: Get file metadata to extract filename (optional, fallback to default)
      let filename = `file-${fileId}`;
      try {
        const fileMetadata = await fileStorageService.getFileMetadata(fileId);
        filename = (fileMetadata as { filename?: string })?.filename || filename;
        logger.info('Retrieved file metadata', { fileId, filename });
      } catch (error) {
        logger.warn('Could not retrieve file metadata, using default filename', { fileId, error: (error as Error).message });
      }

      // Step 2: Create CSV import record with status "processing"
      const csvImport = await binanceDbService.createCsvImport({
        fileId,
        filename,
        status: 'processing',
      });
      csvImportId = (csvImport as { id: number })?.id;
      if (!csvImportId) {
        throw new Error('Failed to create CSV import record');
      }
      logger.info('Created CSV import record', { csvImportId, fileId });

      // Step 3: Get CSV from file-storage-api
      const csvContent = await fileStorageService.getCsvFile(fileId);
      logger.info('Retrieved CSV file', { fileId, contentLength: csvContent.length });

      // Step 4: Parse CSV
      const parsedData = await this.parseCsv(csvContent);
      logger.info('Parsed CSV', { fileId, rowCount: parsedData.rows.length });

      // Step 5: Transform to DB format
      const transformedData = await this.transformToDbFormat(parsedData, appUserId, filename);
      logger.info('Transformed CSV data', { fileId, recordCount: transformedData.length });

      // Step 6: Save to binance-db-api (bulk insert) with source and appUserId
      const bulkResult = await binanceDbService.saveBulkData(transformedData, {
        source: `csv:${filename}`,
        appUserId,
      });
      logger.info('Saved CSV data to database', { fileId, recordCount: transformedData.length });

      // Extract results from bulk operation
      const result = bulkResult as {
        inserted?: number;
        duplicated?: number;
        failed?: number;
      };

      const recordsInserted = result.inserted || 0;
      const recordsDuplicated = result.duplicated || 0;
      const recordsFailed = result.failed || 0;
      const recordsProcessed = transformedData.length;

      // Step 7: Update CSV import record with results
      await binanceDbService.updateCsvImport(csvImportId, {
        status: 'success',
        recordsProcessed,
        recordsInserted,
        recordsDuplicated,
        recordsFailed,
      });
      logger.info('Updated CSV import record', { csvImportId, recordsInserted, recordsDuplicated, recordsFailed });

      return {
        csvImportId,
        recordsProcessed,
        recordsInserted,
        recordsDuplicated,
        recordsFailed,
        success: true,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Error in CSV processing flow', { fileId, csvImportId, error: err.message });

      // Update CSV import record with error status if it was created
      if (csvImportId !== null) {
        try {
          await binanceDbService.updateCsvImport(csvImportId, {
            status: 'failed',
            errorMessage: err.message,
          });
        } catch (updateError) {
          logger.error('Failed to update CSV import record with error', { csvImportId, error: (updateError as Error).message });
        }
      }

      throw new Error(`Failed to process CSV: ${err.message}`);
    }
  }
}

// Export singleton instance
export const csvProcessorService = new CsvProcessorService();

