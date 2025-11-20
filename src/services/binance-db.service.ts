import { servicesConfig } from '@config/services.config';
import { createHttpClient, type IHttpClient, type HttpClientError } from '@utils/http-client';
import { logger } from '@utils/logger';

/**
 * Service to interact with binance-db-api
 */
export class BinanceDbService {
  private client: IHttpClient;

  constructor(customClient?: IHttpClient) {
    const config = servicesConfig.binanceDbApi;
    
    if (customClient) {
      this.client = customClient;
    } else {
      this.client = createHttpClient(config.baseURL, config.timeout);
    }
  }

  /**
   * Queries data from binance-db-api
   * @param params Query parameters
   * @returns Query results
   */
  async queryData(params: Record<string, unknown>): Promise<unknown> {
    try {
      logger.info('Querying data from binance-db-api', { params });

      // Build query string from params
      const queryString = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryString.append(key, String(value));
        }
      }

      const url = `/api/transactions${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      
      const response = await this.client.request<unknown>({
        method: 'GET',
        url,
      });

      logger.info('Successfully queried data from binance-db-api', { params });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error querying data from binance-db-api', { params, error: httpError.message });
      throw new Error(`Failed to query data: ${httpError.message}`);
    }
  }

  /**
   * Saves data to binance-db-api
   * @param data Data to save
   * @returns Saved data with ID
   */
  async saveData(data: Record<string, unknown>): Promise<unknown> {
    try {
      logger.info('Saving data to binance-db-api', { dataKeys: Object.keys(data) });

      const response = await this.client.request<unknown>({
        method: 'POST',
        url: '/api/transactions',
        data,
      });

      logger.info('Successfully saved data to binance-db-api');
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error saving data to binance-db-api', { error: httpError.message });
      throw new Error(`Failed to save data: ${httpError.message}`);
    }
  }

  /**
   * Saves multiple records in bulk to binance-db-api
   * @param records Array of records to save
   * @param options Optional parameters for source and appUserId
   * @returns Bulk save result
   */
  async saveBulkData(
    records: Record<string, unknown>[],
    options?: {
      source?: string;
      appUserId?: string;
    }
  ): Promise<unknown> {
    try {
      logger.info('Saving bulk data to binance-db-api', { recordCount: records.length, options });

      const payload: Record<string, unknown> = {
        transactions: records,
      };

      if (options?.source) {
        payload.source = options.source;
      }

      if (options?.appUserId) {
        payload.appUserId = options.appUserId;
      }

      const response = await this.client.request<unknown>({
        method: 'POST',
        url: '/api/transactions/bulk',
        data: payload,
      });

      logger.info('Successfully saved bulk data to binance-db-api', { recordCount: records.length });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error saving bulk data to binance-db-api', { error: httpError.message });
      throw new Error(`Failed to save bulk data: ${httpError.message}`);
    }
  }

  /**
   * Updates data in binance-db-api
   * @param id ID of the record to update
   * @param data Data to update
   * @returns Updated data
   */
  async updateData(id: string, data: Record<string, unknown>): Promise<unknown> {
    try {
      logger.info('Updating data in binance-db-api', { id, dataKeys: Object.keys(data) });

      const response = await this.client.request<unknown>({
        method: 'PATCH',
        url: `/api/transactions/${id}`,
        data,
      });

      logger.info('Successfully updated data in binance-db-api', { id });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error updating data in binance-db-api', { id, error: httpError.message });
      throw new Error(`Failed to update data: ${httpError.message}`);
    }
  }

  /**
   * Creates a CSV import record in binance-db-api
   * @param data CSV import data
   * @returns Created CSV import record
   */
  async createCsvImport(data: {
    fileId: string;
    filename: string;
    status: 'processing' | 'success' | 'failed';
  }): Promise<unknown> {
    try {
      logger.info('Creating CSV import record', { data });

      const response = await this.client.request<unknown>({
        method: 'POST',
        url: '/api/csv-imports',
        data,
      });

      logger.info('Successfully created CSV import record');
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error creating CSV import record', { error: httpError.message });
      throw new Error(`Failed to create CSV import: ${httpError.message}`);
    }
  }

  /**
   * Updates a CSV import record in binance-db-api
   * @param id CSV import ID
   * @param data Update data
   * @returns Updated CSV import record
   */
  async updateCsvImport(
    id: number,
    data: {
      status?: 'processing' | 'success' | 'failed';
      recordsProcessed?: number;
      recordsInserted?: number;
      recordsDuplicated?: number;
      recordsFailed?: number;
      errorMessage?: string;
    }
  ): Promise<unknown> {
    try {
      logger.info('Updating CSV import record', { id, data });

      const response = await this.client.request<unknown>({
        method: 'PATCH',
        url: `/api/csv-imports/${id}`,
        data,
      });

      logger.info('Successfully updated CSV import record', { id });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error updating CSV import record', { id, error: httpError.message });
      throw new Error(`Failed to update CSV import: ${httpError.message}`);
    }
  }

  /**
   * Creates a sync job record in binance-db-api
   * @param data Sync job data
   * @returns Created sync job record
   */
  async createSyncJob(data: {
    jobType: 'deposit' | 'withdraw';
    startTime: number;
    endTime: number;
    status: 'success' | 'failed' | 'partial';
  }): Promise<unknown> {
    try {
      logger.info('Creating sync job record', { data });

      const response = await this.client.request<unknown>({
        method: 'POST',
        url: '/api/sync-jobs',
        data,
      });

      logger.info('Successfully created sync job record');
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error creating sync job record', { error: httpError.message });
      throw new Error(`Failed to create sync job: ${httpError.message}`);
    }
  }

  /**
   * Updates a sync job record in binance-db-api
   * @param id Sync job ID
   * @param data Update data
   * @returns Updated sync job record
   */
  async updateSyncJob(
    id: number,
    data: {
      status?: 'success' | 'failed' | 'partial';
      recordsProcessed?: number;
      recordsInserted?: number;
      recordsDuplicated?: number;
      recordsFailed?: number;
      errorMessage?: string;
      nextStartTime?: number;
    }
  ): Promise<unknown> {
    try {
      logger.info('Updating sync job record', { id, data });

      const response = await this.client.request<unknown>({
        method: 'PATCH',
        url: `/api/sync-jobs/${id}`,
        data,
      });

      logger.info('Successfully updated sync job record', { id });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error updating sync job record', { id, error: httpError.message });
      throw new Error(`Failed to update sync job: ${httpError.message}`);
    }
  }

  /**
   * Gets the last successful sync job for a job type
   * @param jobType Job type (deposit or withdraw)
   * @returns Last successful sync job or null
   */
  async getLastSuccessfulSyncJob(jobType: 'deposit' | 'withdraw'): Promise<unknown | null> {
    try {
      logger.info('Getting last successful sync job', { jobType });

      const response = await this.client.request<unknown>({
        method: 'GET',
        url: `/api/sync-jobs/last-successful?jobType=${jobType}`,
      });

      logger.info('Successfully retrieved last successful sync job', { jobType });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      if (httpError.isHttpError && httpError.status === 404) {
        logger.info('No last successful sync job found', { jobType });
        return null;
      }
      logger.error('Error getting last successful sync job', { jobType, error: httpError.message });
      throw new Error(`Failed to get last successful sync job: ${httpError.message}`);
    }
  }

  /**
   * Gets the next time range for synchronization
   * @param jobType Job type (deposit or withdraw)
   * @returns Time range with startTime and endTime
   */
  async getNextTimeRange(jobType: 'deposit' | 'withdraw'): Promise<{ startTime: number; endTime: number }> {
    try {
      logger.info('Getting next time range', { jobType });

      const response = await this.client.request<{ startTime: number; endTime: number }>({
        method: 'GET',
        url: `/api/sync-jobs/next-time-range?jobType=${jobType}`,
      });

      logger.info('Successfully retrieved next time range', { jobType, range: response.data });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error getting next time range', { jobType, error: httpError.message });
      throw new Error(`Failed to get next time range: ${httpError.message}`);
    }
  }
}

// Export singleton instance
export const binanceDbService = new BinanceDbService();

