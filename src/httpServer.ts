import express from 'express';
import type { Request, Response } from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { HttpConfig } from './config.js';
import { normalizeForComparison } from './config.js';

// Generate unique session IDs to avoid conflicts on reconnection
let sessionCounter = 0;

function generateSessionId(): string {
  const timestamp = Date.now();
  const counter = ++sessionCounter;
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${counter}-${random}`;
}

export async function startHttpServer(server: McpServer, httpConfig: HttpConfig) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: generateSessionId,
    allowedOrigins: ['*'],
  });

  await server.connect(transport);

  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type,accept');
    // Disable buffering for SSE
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');
    // SSE headers
    if (req.headers.accept?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Connection', 'keep-alive');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (!httpConfig.healthPathVariants.has(normalizeForComparison(req.path))) {
      return next();
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(async (req: Request, res: Response, next) => {
    const normalizedPath = normalizeForComparison(req.path);
    if (!httpConfig.allowedMcpPaths.has(normalizedPath)) {
      return next();
    }

    // Handle connection cleanup on client disconnect
    const cleanup = () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log conflict errors for debugging
      if (errorMessage.includes('Conflict') || errorMessage.includes('Failed to open SSE stream')) {
        console.error(`[SSE Conflict] Path: ${req.path}, Method: ${req.method}, Error: ${errorMessage}`);
      } else {
        console.error('HTTP request handling error:', error);
      }

      if (!res.headersSent) {
        // Return 409 Conflict for SSE stream conflicts
        if (errorMessage.includes('Conflict') || errorMessage.includes('Failed to open SSE stream')) {
          res.status(409).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Session conflict. Please retry with a new connection.',
            },
            id: null,
          });
        } else {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  await new Promise<void>((resolve, reject) => {
    app
      .listen(httpConfig.port, httpConfig.host, () => {
        console.error('Binance DB API MCP server running (HTTP transport)');
        const exposedPaths = Array.from(httpConfig.allowedMcpPaths)
          .sort()
          .map((path) => `http://${httpConfig.host}:${httpConfig.port}${path}`);
        console.error(
          `Listening on http://${httpConfig.host}:${httpConfig.port}${httpConfig.basePath}`,
        );
        console.error('MCP endpoints:');
        for (const endpoint of exposedPaths) {
          console.error(`- ${endpoint}`);
        }
        console.error(
          `Health endpoint: http://${httpConfig.host}:${httpConfig.port}${httpConfig.healthPathForLog}`,
        );
        resolve();
      })
      .on('error', reject);
  });
}

