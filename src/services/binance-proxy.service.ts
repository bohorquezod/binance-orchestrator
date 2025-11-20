import { servicesConfig } from '@config/services.config';
import { createHttpClient, type IHttpClient, type HttpClientError } from '@utils/http-client';
import { logger } from '@utils/logger';

/**
 * Service to interact with binance-proxy
 */
export class BinanceProxyService {
  private client: IHttpClient;

  constructor(customClient?: IHttpClient) {
    const config = servicesConfig.binanceProxy;
    
    if (customClient) {
      this.client = customClient;
    } else {
      this.client = createHttpClient(config.baseURL, config.timeout);
    }
  }

  /**
   * Gets market data from binance-proxy
   * @param endpoint API endpoint (e.g., '/api/v1/market/ticker/24hr')
   * @param params Optional query parameters
   * @returns Market data
   */
  async getMarketData(endpoint: string, params?: Record<string, unknown>): Promise<unknown> {
    try {
      logger.info('Fetching market data from binance-proxy', { endpoint, params });

      // Build query string from params
      const queryString = new URLSearchParams();
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            queryString.append(key, String(value));
          }
        }
      }

      const url = `${endpoint}${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      
      const response = await this.client.request<unknown>({
        method: 'GET',
        url,
      });

      logger.info('Successfully fetched market data from binance-proxy', { endpoint });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error fetching market data from binance-proxy', { endpoint, error: httpError.message });
      throw new Error(`Failed to fetch market data: ${httpError.message}`);
    }
  }

  /**
   * Gets account data from binance-proxy (requires authentication)
   * @param endpoint API endpoint (e.g., '/api/v1/account/info')
   * @param params Optional query parameters
   * @param apiKey Optional API key for authentication
   * @returns Account data
   */
  async getAccountData(
    endpoint: string, 
    params?: Record<string, unknown>,
    apiKey?: string
  ): Promise<unknown> {
    try {
      logger.info('Fetching account data from binance-proxy', { endpoint, params });

      // Build query string from params
      const queryString = new URLSearchParams();
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            queryString.append(key, String(value));
          }
        }
      }

      const url = `${endpoint}${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await this.client.request<unknown>({
        method: 'GET',
        url,
        headers,
      });

      logger.info('Successfully fetched account data from binance-proxy', { endpoint });
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error fetching account data from binance-proxy', { endpoint, error: httpError.message });
      throw new Error(`Failed to fetch account data: ${httpError.message}`);
    }
  }

  /**
   * Gets ticker 24hr data for a symbol
   * @param symbol Trading symbol (e.g., 'BTCUSDT')
   * @returns Ticker data
   */
  async getTicker24hr(symbol?: string): Promise<unknown> {
    const endpoint = '/api/v1/market/ticker/24hr';
    const params = symbol ? { symbol } : undefined;
    return this.getMarketData(endpoint, params);
  }

  /**
   * Gets symbol price
   * @param symbol Trading symbol (e.g., 'BTCUSDT')
   * @returns Price data
   */
  async getSymbolPrice(symbol?: string): Promise<unknown> {
    const endpoint = '/api/v1/market/ticker/price';
    const params = symbol ? { symbol } : undefined;
    return this.getMarketData(endpoint, params);
  }

  /**
   * Gets klines (candlestick data)
   * @param symbol Trading symbol
   * @param interval Kline interval
   * @param limit Number of klines to return
   * @returns Klines data
   */
  async getKlines(symbol: string, interval: string, limit?: number): Promise<unknown> {
    const endpoint = '/api/v1/market/klines';
    const params: Record<string, unknown> = { symbol, interval };
    if (limit) {
      params.limit = limit;
    }
    return this.getMarketData(endpoint, params);
  }

  /**
   * Gets deposit history from binance-proxy
   * @param params Deposit history parameters
   * @returns Deposit history data
   */
  async getDepositHistory(params: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    coin?: string;
    status?: number;
    apiKey?: string;
  }): Promise<unknown> {
    try {
      logger.info('Fetching deposit history from binance-proxy', { params: { ...params, apiKey: params.apiKey ? '***' : undefined } });

      const queryString = new URLSearchParams();
      if (params.startTime !== undefined) {
        queryString.append('startTime', String(params.startTime));
      }
      if (params.endTime !== undefined) {
        queryString.append('endTime', String(params.endTime));
      }
      if (params.limit !== undefined) {
        queryString.append('limit', String(params.limit));
      }
      if (params.coin) {
        queryString.append('coin', params.coin);
      }
      if (params.status !== undefined) {
        queryString.append('status', String(params.status));
      }

      const url = `/api/v1/wallet/deposit/history${queryString.toString() ? `?${queryString.toString()}` : ''}`;

      const headers: Record<string, string> = {};
      if (params.apiKey) {
        headers['X-API-Key'] = params.apiKey;
      }

      const response = await this.client.request<unknown>({
        method: 'GET',
        url,
        headers,
      });

      logger.info('Successfully fetched deposit history from binance-proxy');
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error fetching deposit history from binance-proxy', { error: httpError.message });
      throw new Error(`Failed to fetch deposit history: ${httpError.message}`);
    }
  }

  /**
   * Gets withdrawal history from binance-proxy
   * @param params Withdrawal history parameters
   * @returns Withdrawal history data
   */
  async getWithdrawHistory(params: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    coin?: string;
    status?: number;
    apiKey?: string;
  }): Promise<unknown> {
    try {
      logger.info('Fetching withdrawal history from binance-proxy', { params: { ...params, apiKey: params.apiKey ? '***' : undefined } });

      const queryString = new URLSearchParams();
      if (params.startTime !== undefined) {
        queryString.append('startTime', String(params.startTime));
      }
      if (params.endTime !== undefined) {
        queryString.append('endTime', String(params.endTime));
      }
      if (params.limit !== undefined) {
        queryString.append('limit', String(params.limit));
      }
      if (params.coin) {
        queryString.append('coin', params.coin);
      }
      if (params.status !== undefined) {
        queryString.append('status', String(params.status));
      }

      const url = `/api/v1/wallet/withdraw/history${queryString.toString() ? `?${queryString.toString()}` : ''}`;

      const headers: Record<string, string> = {};
      if (params.apiKey) {
        headers['X-API-Key'] = params.apiKey;
      }

      const response = await this.client.request<unknown>({
        method: 'GET',
        url,
        headers,
      });

      logger.info('Successfully fetched withdrawal history from binance-proxy');
      return response.data;
    } catch (error) {
      const httpError = error as HttpClientError;
      logger.error('Error fetching withdrawal history from binance-proxy', { error: httpError.message });
      throw new Error(`Failed to fetch withdrawal history: ${httpError.message}`);
    }
  }
}

// Export singleton instance
export const binanceProxyService = new BinanceProxyService();

