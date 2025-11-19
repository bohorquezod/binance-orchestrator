/**
 * Unified interface for HTTP clients
 * Allows changing implementation (axios, fetch, etc.) without modifying the code that uses it
 */

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: string | Record<string, unknown>;
  timeout?: number;
}

export interface HttpClientError extends Error {
  isHttpError: boolean;
  status?: number;
  response?: {
    status: number;
    data: unknown;
  };
}

/**
 * Interface for HTTP client
 * Implementations: AxiosHttpClient, FetchHttpClient, etc.
 */
export interface IHttpClient {
  /**
   * Performs an HTTP request
   * @param config Request configuration
   * @returns Promise with the response
   */
  request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
}

