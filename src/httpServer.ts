import express from 'express';
import type { Request, Response } from 'express';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { HttpConfig } from './config.js';
import { normalizeForComparison } from './config.js';

export async function startHttpServer(server: Server, httpConfig: HttpConfig) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    allowedOrigins: ['*'],
    onsessionclosed: async () => {
      // Clean up when session is closed
      console.error('[MCP] Session closed, cleaning up streams');
    },
  });

  await server.connect(transport);

  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type,accept');
    // Disable buffering for SSE (important for Traefik/nginx)
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');
    // Note: Do not set SSE headers here - let the MCP SDK handle them
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

    // Intercept SSE GET requests to close any existing stream before SDK processes it
    const isSseRequest = req.method === 'GET' && req.headers.accept?.includes('text/event-stream');
    
    if (isSseRequest) {
      // Access internal stream mapping to check for existing SSE stream
      const transportAny = transport as any;
      const standaloneSseStreamId = '_GET_stream';
      const streamMapping = transportAny._streamMapping;
      
      if (streamMapping) {
        const existingStream = streamMapping.get(standaloneSseStreamId);
        
        if (existingStream && !existingStream.writableEnded) {
          console.error('[MCP] Closing existing SSE stream before opening new one');
          try {
            existingStream.end();
            // Remove from mapping immediately to prevent conflict
            streamMapping.delete(standaloneSseStreamId);
            // Give it a moment to close
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (error) {
            console.error('[MCP] Error closing existing stream:', error);
            // Still remove from mapping even if closing failed
            streamMapping.delete(standaloneSseStreamId);
          }
        }
      }
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('HTTP request handling error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
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

