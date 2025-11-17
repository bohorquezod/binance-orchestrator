# Deployment Guide - Binance DB API MCP

## HTTP Transport Configuration

This MCP server is configured to use HTTP transport by default, making it suitable for server deployment.

## Environment Variables for Deployment

```bash
# API Configuration
BINANCE_DB_API_URL=http://binance-db-api:3000/api
OPENAPI_SPEC_URL=http://binance-db-api:3000/api-docs.json
DB_SCHEMA_URL=http://binance-db-api:3000/db/schema

# Transport Mode (default: http)
BINANCE_DB_API_TRANSPORT=http

# HTTP Server Configuration
BINANCE_DB_API_HTTP_HOST=0.0.0.0
BINANCE_DB_API_HTTP_PORT=8080
BINANCE_DB_API_HTTP_PATH=/
BINANCE_DB_API_HTTP_HEALTH_PATH=/health
```

## Available Endpoints

When running in HTTP mode, the server exposes:

- **MCP Endpoint**: `/.well-known/mcp` or `/` (depending on basePath)
- **Health Check**: `/health`

## Docker Deployment

```bash
docker build -t binance-db-api-mcp .
docker run -d \
  -p 8080:8080 \
  -e BINANCE_DB_API_URL=http://binance-db-api:3000/api \
  -e OPENAPI_SPEC_URL=http://binance-db-api:3000/api-docs.json \
  -e DB_SCHEMA_URL=http://binance-db-api:3000/db/schema \
  -e BINANCE_DB_API_TRANSPORT=http \
  --name binance-db-api-mcp \
  binance-db-api-mcp
```

## Behind a Reverse Proxy (Nginx/Traefik)

If deploying behind a reverse proxy (like your server-gateway), configure the proxy to forward requests to the MCP server:

### Nginx Example

```nginx
location /binance-db-api {
    proxy_pass http://binance-db-api-mcp:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Traefik Example

```yaml
labels:
  - "traefik.http.routers.binance-db-api-mcp.rule=PathPrefix(`/binance-db-api`)"
  - "traefik.http.services.binance-db-api-mcp.loadbalancer.server.port=8080"
```

## Cursor Configuration

In your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "binance-db-api": {
      "url": "http://mcp.borasta.sytes.net:3000/binance-db-api"
    }
  }
}
```

The URL should point to where your reverse proxy/gateway exposes the MCP server.

## Health Check

The server exposes a health endpoint at `/health`:

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

