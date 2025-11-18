import express from 'express';
import type { Request, Response } from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { HttpConfig } from './config.js';
import { normalizeForComparison } from './config.js';

export async function startHttpServer(server: McpServer, httpConfig: HttpConfig) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    allowedOrigins: ['*'],
  });

  await server.connect(transport);

  const app = express();
  let activeSseResponse: Response | null = null;

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

    const isSseRequest = req.method === 'GET' && req.headers.accept?.includes('text/event-stream');

    if (isSseRequest && activeSseResponse && activeSseResponse !== res && !activeSseResponse.writableEnded) {
      activeSseResponse.end();
    }

    if (isSseRequest) {
      res.on('close', () => {
        if (activeSseResponse === res) {
          activeSseResponse = null;
        }
      });
    }

    try {
      await transport.handleRequest(req, res);
      if (isSseRequest) {
        activeSseResponse = res;
      }
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

