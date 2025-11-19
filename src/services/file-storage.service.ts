import { servicesConfig } from '@config/services.config';
import { createHttpClient, type IHttpClient, type HttpClientError } from '@utils/http-client';
import { logger } from '@utils/logger';

/**
 * Service to interact with file-storage-api
 */
export class FileStorageService {
  private client: IHttpClient;

  constructor(customClient?: IHttpClient) {
    const config = servicesConfig.fileStorageApi;
    
    if (customClient) {
      this.client = customClient;
    } else {
      this.client = createHttpClient(config.baseURL, config.timeout);
    }
  }

  /**
   * Gets a CSV file from file-storage-api
   * @param fileId ID of the file to retrieve
   * @returns CSV content as string
   */
  async getCsvFile(fileId: string): Promise<string> {
    try {
      logger.info('Fetching CSV file from file-storage-api', { fileId });

      const response = await this.client.request<string>({
        method: 'GET',
        url: `/api/files/${fileId}`,
      });

      if (typeof response.data !== 'string') {
        throw new Error('Invalid response format: expected string CSV content');
      }

      logger.info('Successfully fetched CSV file', { fileId, size: response.data.length });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      if (httpError.isHttpError && httpError.status === 404) {
        throw new Error(`File not found: ${fileId}`);
      }
      logger.error('Error fetching CSV file', { fileId, error: httpError.message });
      throw new Error(`Failed to fetch CSV file: ${httpError.message}`);
    }
  }

  /**
   * Gets file metadata from file-storage-api
   * @param fileId ID of the file
   * @returns File metadata
   */
  async getFileMetadata(fileId: string): Promise<unknown> {
    try {
      logger.info('Fetching file metadata from file-storage-api', { fileId });

      const response = await this.client.request<unknown>({
        method: 'GET',
        url: `/api/files/${fileId}/metadata`,
      });

      logger.info('Successfully fetched file metadata', { fileId });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error fetching file metadata', { fileId, error: httpError.message });
      throw new Error(`Failed to fetch file metadata: ${httpError.message}`);
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();

