#!/usr/bin/env node

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { ApiClient } from './apiClient.js';
import { createMcpServer } from './mcpServer.js';
import { startHttpServer } from './httpServer.js';

async function startStdioServer(server: McpServer, apiUrl: string) {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Binance DB API MCP server running (stdio transport)');
  console.error(`Connected to API: ${apiUrl}`);
}

async function main() {
  const config = loadConfig();
  const apiClient = new ApiClient(config.api);
  const server = createMcpServer(apiClient);

  if (config.transportMode === 'stdio') {
    await startStdioServer(server, config.api.baseUrl);
    return;
  }

  if (config.transportMode === 'http') {
    await startHttpServer(server, config.http);
    console.error(`Connected to API: ${config.api.baseUrl}`);
    console.error(`OpenAPI Spec URL: ${config.api.openApiSpecUrl}`);
    console.error(`DB Schema URL: ${config.api.dbSchemaUrl}`);
    return;
  }

  throw new Error(`Unsupported transport "${config.transportMode}"`);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

