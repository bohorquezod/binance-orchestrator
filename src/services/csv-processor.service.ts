import { parse } from 'csv-parse/sync';
import { fileStorageService } from './file-storage.service';
import { binanceDbService } from './binance-db.service';
import { logger } from '@utils/logger';
import type { ParsedCsvData, CsvRow } from '@/types/orchestrator.types';

/**
 * Service for processing CSV files
 */
export class CsvProcessorService {
  /**
   * Parses CSV content into structured data
   * @param csvContent Raw CSV string
   * @returns Parsed CSV data with headers and rows
   */
  async parseCsv(csvContent: string): Promise<ParsedCsvData> {
    try {
      logger.info('Parsing CSV content', { contentLength: csvContent.length });

      const records = parse(csvContent, {
        columns: true, // Use first line as column names
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Try to convert to number if possible
          if (context.header) {
            return value;
          }
          const numValue = Number(value);
          if (!isNaN(numValue) && value.trim() !== '') {
            return numValue;
          }
          return value;
        },
      }) as CsvRow[];

      if (records.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }

      const headers = Object.keys(records[0]);
      
      logger.info('Successfully parsed CSV', { 
        rowCount: records.length, 
        columnCount: headers.length,
        headers 
      });

      return {
        headers,
        rows: records,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Error parsing CSV', { error: err.message });
      throw new Error(`Failed to parse CSV: ${err.message}`);
    }
  }

  /**
   * Transforms CSV data to the format expected by binance-db-api
   * This is a generic transformation - adjust based on actual CSV structure
   * @param csvData Parsed CSV data
   * @returns Transformed data ready for database
   */
  async transformToDbFormat(csvData: ParsedCsvData): Promise<Record<string, unknown>[]> {
    try {
      logger.info('Transforming CSV data to DB format', { rowCount: csvData.rows.length });

      // Transform each row to match the expected database schema
      // This is a generic transformation - adjust based on actual requirements
      const transformed = csvData.rows.map((row, index) => {
        const record: Record<string, unknown> = {};
        
        // Map CSV columns to database fields
        // Adjust this mapping based on actual CSV structure and DB schema
        for (const [key, value] of Object.entries(row)) {
          // Normalize column names (lowercase, replace spaces with underscores)
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          record[normalizedKey] = value;
        }

        // Add metadata if needed
        record.processed_at = new Date().toISOString();
        record.source = 'csv_import';

        return record;
      });

      logger.info('Successfully transformed CSV data', { recordCount: transformed.length });
      return transformed;
    } catch (error) {
      const err = error as Error;
      logger.error('Error transforming CSV data', { error: err.message });
      throw new Error(`Failed to transform CSV data: ${err.message}`);
    }
  }

  /**
   * Complete flow: Get CSV from file-storage-api, parse it, transform it, and save to binance-db-api
   * @param fileId ID of the CSV file in file-storage-api
   * @returns Processing result with record count
   */
  async processAndSave(fileId: string): Promise<{ recordsProcessed: number; success: boolean }> {
    try {
      logger.info('Starting CSV processing flow', { fileId });

      // Step 1: Get CSV from file-storage-api
      const csvContent = await fileStorageService.getCsvFile(fileId);
      logger.info('Retrieved CSV file', { fileId, contentLength: csvContent.length });

      // Step 2: Parse CSV
      const parsedData = await this.parseCsv(csvContent);
      logger.info('Parsed CSV', { fileId, rowCount: parsedData.rows.length });

      // Step 3: Transform to DB format
      const transformedData = await this.transformToDbFormat(parsedData);
      logger.info('Transformed CSV data', { fileId, recordCount: transformedData.length });

      // Step 4: Save to binance-db-api (bulk insert)
      await binanceDbService.saveBulkData(transformedData);
      logger.info('Saved CSV data to database', { fileId, recordCount: transformedData.length });

      return {
        recordsProcessed: transformedData.length,
        success: true,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Error in CSV processing flow', { fileId, error: err.message });
      throw new Error(`Failed to process CSV: ${err.message}`);
    }
  }
}

// Export singleton instance
export const csvProcessorService = new CsvProcessorService();

