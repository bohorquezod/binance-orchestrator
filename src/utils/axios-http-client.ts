import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  IHttpClient,
  HttpRequestConfig,
  HttpResponse,
  HttpClientError,
} from './http-client.interface';
import { logger } from './logger';

/**
 * IHttpClient implementation using Axios
 */
export class AxiosHttpClient implements IHttpClient {
  private client: AxiosInstance;

  constructor(baseURL?: string, timeout: number = 30000, defaultHeaders?: Record<string, string>) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: defaultHeaders,
    });
  }

  /**
   * Makes an HTTP request using Axios
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    try {
      // Combine default client headers with request headers
      // Request headers take priority over default ones
      const requestHeaders = config.headers || {};
      const methodKey = config.method.toLowerCase();
      const defaultsHeaders = this.client.defaults.headers;
      const mergeHeaders = (...sources: Array<unknown>): Record<string, string> => {
        return sources.reduce<Record<string, string>>((acc, source) => {
          if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
            for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
              if (typeof value !== 'undefined') {
                acc[key] = String(value);
              }
            }
          }
          return acc;
        }, {});
      };

      const headers = mergeHeaders(
        defaultsHeaders?.common,
        defaultsHeaders && methodKey ? defaultsHeaders[methodKey as keyof typeof defaultsHeaders] : undefined,
        requestHeaders,
      );

      const axiosConfig: AxiosRequestConfig = {
        method: config.method,
        url: config.url,
        headers,
        timeout: config.timeout,
      };

      // Add parameters according to the method
      // For GET, params are already in the URL (built in services)
      // For POST/PUT/DELETE, data goes in the body
      if (config.data) {
        // For POST/PUT/DELETE, data can be string (form-urlencoded) or object
        if (typeof config.data === 'string') {
          axiosConfig.data = config.data;
          axiosConfig.headers = {
            ...axiosConfig.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          };
        } else {
          axiosConfig.data = config.data;
        }
      }

      logger.debug('HTTP Request', {
        method: config.method,
        url: config.url,
        hasParams: !!config.params,
      });

      const response = await this.client.request<T>(axiosConfig);

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: unknown) {
      // Convert axios errors to HttpClientError
      if (axios.isAxiosError(error)) {
        const httpError: HttpClientError = {
          name: 'HttpClientError',
          message: error.message,
          isHttpError: true,
          status: error.response?.status,
          response: error.response
            ? {
                status: error.response.status,
                data: error.response.data,
              }
            : undefined,
        };
        throw httpError;
      }

      // If it's not an axios error, rethrow it
      throw error;
    }
  }

  /**
   * Method to set default headers (e.g., API Key)
   */
  setDefaultHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  /**
   * Method to remove default header
   */
  removeDefaultHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }
}

