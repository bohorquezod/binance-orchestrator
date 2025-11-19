/**
 * Unified HTTP client
 * 
 * This is the default implementation used by the entire project.
 * To change library (axios → fetch, etc.), just modify this export.
 */

import { AxiosHttpClient } from './axios-http-client';
import { IHttpClient } from './http-client.interface';

// Export the interface so other modules can type correctly
export type { IHttpClient, HttpResponse, HttpRequestConfig, HttpClientError } from './http-client.interface';

/**
 * Factory to create custom HTTP clients
 * 
 * This function creates configured HTTP client instances.
 * By default uses AxiosHttpClient as implementation.
 * 
 * To change implementation:
 * 1. Create a new class that implements IHttpClient (e.g., FetchHttpClient)
 * 2. Change this function to use the new class
 */
export function createHttpClient(
  baseURL?: string,
  timeout: number = 30000,
  defaultHeaders?: Record<string, string>
): IHttpClient {
  return new AxiosHttpClient(baseURL, timeout, defaultHeaders);
}

/**
 * Default HTTP client
 * 
 * To change global implementation:
 * 1. Modify this createHttpClient function to return another implementation
 * 2. Or create your own instance using createHttpClient() where needed
 */
export const httpClient = createHttpClient();

