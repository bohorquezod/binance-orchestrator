/**
 * Type definitions for orchestrator operations
 */

export interface ProcessCsvRequest {
  fileId: string;
}

export interface ProcessCsvResponse {
  success: boolean;
  message: string;
  recordsProcessed?: number;
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

