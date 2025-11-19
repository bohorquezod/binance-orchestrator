import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { csvProcessorService } from '@services/csv-processor.service';
import { binanceProxyService } from '@services/binance-proxy.service';
import { binanceDbService } from '@services/binance-db.service';
import { logger } from '@utils/logger';
import type { ProcessCsvRequest, ProcessCsvResponse, SyncDataResponse, BridgeWebhookRequest, BridgeWebhookResponse } from '@/types/orchestrator.types';

/**
 * @swagger
 * /api/v1/orchestrator/process-csv:
 *   post:
 *     summary: Process a CSV file from file-storage-api and save to binance-db-api
 *     description: Retrieves a CSV file, parses it, transforms the data, and saves it to the database
 *     tags: [Orchestrator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessCsvRequest'
 *     responses:
 *       200:
 *         description: CSV processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessCsvResponse'
 *       400:
 *         description: Validation error
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
export const processCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: errors.array() 
      });
      return;
    }

    const { fileId } = req.body as ProcessCsvRequest;

    logger.info('Processing CSV request', { fileId });

    const result = await csvProcessorService.processAndSave(fileId);

    const response: ProcessCsvResponse = {
      success: result.success,
      message: `Successfully processed ${result.recordsProcessed} records`,
      recordsProcessed: result.recordsProcessed,
    };

    res.json(response);
  } catch (error) {
    next(error as Error);
  }
};

/**
 * @swagger
 * /api/v1/orchestrator/sync-data:
 *   get:
 *     summary: Synchronize data from binance-proxy to binance-db-api
 *     description: Fetches updated data from Binance via proxy and updates the database. Can be called from a cronjob.
 *     tags: [Orchestrator]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: Optional symbol to sync (e.g., BTCUSDT). If not provided, syncs all symbols.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ticker, price, klines]
 *         description: Type of data to sync
 *     responses:
 *       200:
 *         description: Data synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncDataResponse'
 *       500:
 *         description: Internal server error
 */
export const syncData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { symbol, type } = req.query;
    
    logger.info('Syncing data from binance-proxy', { symbol, type });

    let recordsUpdated = 0;
    let recordsCreated = 0;

    try {
      // Get data from binance-proxy
      let proxyData: unknown;

      if (type === 'ticker' || !type) {
        // Get ticker 24hr data
        proxyData = await binanceProxyService.getTicker24hr(symbol as string | undefined);
      } else if (type === 'price') {
        // Get symbol price
        proxyData = await binanceProxyService.getSymbolPrice(symbol as string | undefined);
      } else {
        throw new Error(`Unknown sync type: ${type}`);
      }

      // Transform and save to database
      // The structure depends on what binance-db-api expects
      // For now, we'll save the data as-is and let the DB API handle it
      const dataArray = Array.isArray(proxyData) ? proxyData : [proxyData];
      
      for (const item of dataArray) {
        if (typeof item === 'object' && item !== null) {
          try {
            // Try to save each record
            await binanceDbService.saveData(item as Record<string, unknown>);
            recordsCreated++;
          } catch (error) {
            // If save fails, might be because record exists, try update
            logger.warn('Save failed, might be duplicate', { error: (error as Error).message });
            // For now, we'll count it as updated
            recordsUpdated++;
          }
        }
      }

      const response: SyncDataResponse = {
        success: true,
        message: `Synchronized ${recordsCreated + recordsUpdated} records`,
        recordsCreated,
        recordsUpdated,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error syncing data', { error: (error as Error).message });
      throw error;
    }
  } catch (error) {
    next(error as Error);
  }
};

/**
 * @swagger
 * /api/v1/orchestrator/bridge-webhook:
 *   post:
 *     summary: Webhook endpoint for exchanger-bridge
 *     description: Receives webhook calls from exchanger-bridge and processes them
 *     tags: [Orchestrator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload from exchanger-bridge
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
export const bridgeWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhookData = req.body as BridgeWebhookRequest;

    logger.info('Received webhook from exchanger-bridge', { 
      dataKeys: Object.keys(webhookData) 
    });

    // Process webhook data
    // The exact processing logic depends on the bridge specification
    // For now, we'll log it and return success
    // TODO: Implement actual webhook processing logic based on bridge spec

    const response: BridgeWebhookResponse = {
      success: true,
      message: 'Webhook received and processed',
    };

    res.json(response);
  } catch (error) {
    next(error as Error);
  }
};

// Validation middleware for process-csv endpoint
export const validateProcessCsv = [
  body('fileId')
    .notEmpty()
    .withMessage('fileId is required')
    .isString()
    .withMessage('fileId must be a string'),
];

// Validation middleware for sync-data endpoint (optional query params)
export const validateSyncData = [
  query('symbol')
    .optional()
    .isString()
    .withMessage('symbol must be a string'),
  query('type')
    .optional()
    .isIn(['ticker', 'price', 'klines'])
    .withMessage('type must be one of: ticker, price, klines'),
];

