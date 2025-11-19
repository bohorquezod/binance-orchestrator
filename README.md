# Binance Orchestrator

Orchestrator service for coordinating multiple Binance-related microservices. This service acts as a central coordinator between `file-storage-api`, `binance-db-api`, `binance-proxy`, and `exchanger-bridge`.

## Features

- **CSV Processing**: Retrieves CSV files from `file-storage-api`, parses them, and saves processed data to `binance-db-api`
- **Data Synchronization**: Syncs data from `binance-proxy` to `binance-db-api` (can be called from cronjobs)
- **Webhook Handling**: Receives and processes webhooks from `exchanger-bridge`
- **Service Coordination**: Acts as an intermediary between multiple microservices

## Prerequisites

- Node.js 20 (see `.nvmrc`)
- npm or yarn
- Docker and Docker Compose (for containerized deployment)
- Access to the following services:
  - `file-storage-api`
  - `binance-db-api`
  - `binance-proxy`

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd binance-orchestrator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development

# Servicios externos
FILE_STORAGE_API_URL=http://file-storage-api:3000
BINANCE_DB_API_URL=http://binance-db-api:3000
BINANCE_PROXY_URL=http://binance-proxy:3000

# Traefik (para producción)
TRAEFIK_PREFIX=/binance-orchestrator
DOMAIN=api.borasta.sytes.net

# Logging
LOG_LEVEL=info
```

## Development

### Running Locally

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `PORT`).

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## API Endpoints

### Health Check

- `GET /health` - Health check endpoint

### Orchestrator Endpoints

- `POST /api/v1/orchestrator/process-csv` - Process a CSV file from file-storage-api
  - Body: `{ "fileId": "string" }`
  
- `GET /api/v1/orchestrator/sync-data` - Synchronize data from binance-proxy to binance-db-api
  - Query params (optional):
    - `symbol`: Trading symbol (e.g., BTCUSDT)
    - `type`: Type of data to sync (ticker, price, klines)
  
- `POST /api/v1/orchestrator/bridge-webhook` - Webhook endpoint for exchanger-bridge
  - Body: Webhook payload from exchanger-bridge

### Documentation

- `GET /api-docs` - Swagger UI documentation
- `GET /api-docs.json` - OpenAPI specification in JSON format

## Docker Deployment

### Build and Run

```bash
# Build the image
npm run docker:build

# Start the container
npm run docker:up

# View logs
npm run docker:logs

# Stop the container
npm run docker:down
```

### Docker Compose

The `docker-compose.yml` file is configured with Traefik labels for reverse proxy integration. Make sure the `proxy` network exists:

```bash
docker network create proxy
```

## Project Structure

```
binance-orchestrator/
├── src/
│   ├── config/          # Configuraciones (env, swagger, servicios externos)
│   │   ├── env.config.ts
│   │   ├── services.config.ts
│   │   └── swagger.config.ts
│   ├── controllers/     # Controladores de endpoints
│   │   ├── orchestrator.controller.ts
│   │   └── health.controller.ts
│   ├── services/         # Lógica de negocio
│   │   ├── file-storage.service.ts
│   │   ├── binance-db.service.ts
│   │   ├── binance-proxy.service.ts
│   │   └── csv-processor.service.ts
│   ├── middleware/       # Middlewares (auth, errors)
│   │   └── error.middleware.ts
│   ├── types/            # Tipos TypeScript
│   │   └── orchestrator.types.ts
│   ├── utils/            # Utilidades (logger, http-client)
│   │   ├── logger.ts
│   │   ├── http-client.interface.ts
│   │   ├── http-client.ts
│   │   └── axios-http-client.ts
│   └── app.ts            # Configuración Express
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── .gitignore
├── .nvmrc
└── README.md
```

## Integration with Other Services

### File Storage API

The orchestrator retrieves CSV files from `file-storage-api` using the file ID:
- Endpoint: `GET /api/files/{fileId}`

### Binance DB API

The orchestrator saves processed data to `binance-db-api`:
- Endpoint: `POST /api/v1/transactions/bulk` (for bulk inserts)
- Endpoint: `POST /api/v1/transactions` (for single inserts)
- Endpoint: `GET /api/v1/transactions` (for queries)

### Binance Proxy

The orchestrator fetches market data from `binance-proxy`:
- Endpoint: `GET /api/v1/market/ticker/24hr`
- Endpoint: `GET /api/v1/market/ticker/price`
- Endpoint: `GET /api/v1/market/klines`

### Exchanger Bridge

The orchestrator receives webhooks from `exchanger-bridge`:
- Endpoint: `POST /api/v1/orchestrator/bridge-webhook`

## CSV Processing Flow

1. Receive request with `fileId`
2. Call `file-storage-api` to get CSV content
3. Parse CSV using `csv-parse`
4. Transform data to match database schema
5. Save transformed data to `binance-db-api` using bulk insert
6. Return processing result

## Data Synchronization Flow

1. Receive sync request (optionally with symbol/type filters)
2. Call `binance-proxy` to get updated data
3. Transform data if needed
4. Save/update data in `binance-db-api`
5. Return sync summary

## Error Handling

The service includes centralized error handling:
- Validation errors return 400
- Not found errors return 404
- Authentication errors return 401
- Server errors return 500

All errors are logged using Winston logger.

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (in development mode)

Log level can be configured via `LOG_LEVEL` environment variable (default: `info`).

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentación

Para documentación detallada, ver la carpeta [`docs/`](./docs/README.md) que incluye:

- [Arquitectura](./docs/architecture.md) - Arquitectura del sistema
- [Endpoints](./docs/endpoints.md) - Especificación de la API
- [Flujos de Datos](./docs/data-flow.md) - Pipeline de datos
- [Dependencias](./docs/dependencies.md) - Dependencias del proyecto
- [Convenciones](./docs/conventions.md) - Estándares de código
- [Estructura de Carpetas](./docs/folder-structure.md) - Organización del código
- [Testing](./docs/testing.md) - Estrategia de pruebas
- [Despliegue](./docs/deployment.md) - Procesos de despliegue
- [Versionado](./docs/versioning.md) - Estándares de versionado

## Cursor Rules

El proyecto incluye reglas de Cursor en `.cursorrules/` para mantener consistencia:

- `architecture.mdc` - Reglas de arquitectura
- `conventions.mdc` - Reglas de convenciones (always apply)
- `services.mdc` - Reglas de servicios
- `testing.mdc` - Reglas de testing
- `docs.mdc` - Reglas de documentación

## License

MIT

