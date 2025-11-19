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

      const url = `/api/v1/transactions${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      
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
        url: '/api/v1/transactions',
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
   * @returns Bulk save result
   */
  async saveBulkData(records: Record<string, unknown>[]): Promise<unknown> {
    try {
      logger.info('Saving bulk data to binance-db-api', { recordCount: records.length });

      const response = await this.client.request<unknown>({
        method: 'POST',
        url: '/api/v1/transactions/bulk',
        data: { transactions: records },
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
        url: `/api/v1/transactions/${id}`,
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
}

// Export singleton instance
export const binanceDbService = new BinanceDbService();

