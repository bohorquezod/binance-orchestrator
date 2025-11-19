/**
 * Configuration for external services
 * Centralizes URLs and connection settings for all external services
 */

// Import centralized environment variable configuration
import '@config/env.config';

export interface ServicesConfig {
  fileStorageApi: {
    baseURL: string;
    timeout: number;
  };
  binanceDbApi: {
    baseURL: string;
    timeout: number;
  };
  binanceProxy: {
    baseURL: string;
    timeout: number;
  };
}

export const servicesConfig: ServicesConfig = {
  fileStorageApi: {
    baseURL: process.env.FILE_STORAGE_API_URL || 'http://file-storage-api:3000',
    timeout: 30000,
  },
  binanceDbApi: {
    baseURL: process.env.BINANCE_DB_API_URL || 'http://binance-db-api:3000',
    timeout: 30000,
  },
  binanceProxy: {
    baseURL: process.env.BINANCE_PROXY_URL || 'http://binance-proxy:3000',
    timeout: 30000,
  },
};

