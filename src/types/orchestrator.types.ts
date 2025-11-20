/**
 * Type definitions for orchestrator operations
 */

export interface ProcessCsvRequest {
  fileId: string;
  appUserId: string;
}

export interface ProcessCsvResponse {
  success: boolean;
  message: string;
  csvImportId?: number;
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsDuplicated?: number;
  recordsFailed?: number;
  alreadyProcessed?: boolean;
  errors?: Array<{ index: number; message: string }>;
}

export interface SyncDataResponse {
  success: boolean;
  message: string;
  recordsUpdated?: number;
  recordsCreated?: number;
}

export interface BridgeWebhookRequest {
  // This will be defined based on the actual bridge specification
  [key: string]: unknown;
}

export interface BridgeWebhookResponse {
  success: boolean;
  message: string;
}

export interface CsvRow {
  [key: string]: string | number;
}

export interface ParsedCsvData {
  headers: string[];
  rows: CsvRow[];
}

/**
 * Transaction input format matching binance-db-api schema
 */
export interface TransactionInput {
  appUserId?: string;
  binanceUserId: string;
  utcTime: Date | string;
  account: string;
  operation: string;
  coin: string;
  change: string;
  remark?: string | null;
  raw?: Record<string, unknown> | null;
}

/**
 * Request for syncing transactions
 */
export interface SyncTransactionsRequest {
  type: 'deposit' | 'withdraw';
  appUserId: string;
  apiKey: string;
  startTime?: string;  // Timestamp as string
  endTime?: string;    // Timestamp as string
  binanceUserId?: string;
}

/**
 * Response for syncing transactions
 */
export interface SyncTransactionsResponse {
  success: boolean;
  message: string;
  result: SyncJobResult;
}

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

