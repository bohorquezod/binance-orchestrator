# Endpoints y Contratos

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: Configurado vía Traefik con prefijo `/binance-orchestrator`

## Health Check

### GET /health

Health check del servicio.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Orchestrator Endpoints

### POST /api/v1/orchestrator/process-csv

Procesa un archivo CSV desde file-storage-api y lo guarda en binance-db-api.

**Request Body:**
```json
{
  "fileId": "string"
}
```

**Validation:**
- `fileId`: Required, string, not empty

**Response 200:**
```json
{
  "success": true,
  "message": "Successfully processed 100 records",
  "recordsProcessed": 100
}
```

**Error Responses:**
- `400`: Validation error
- `404`: File not found
- `500`: Internal server error

**Flow:**
1. Obtiene CSV desde file-storage-api usando `fileId`
2. Parsea CSV a estructura de datos
3. Transforma datos al formato esperado por binance-db-api
4. Guarda datos usando bulk insert
5. Retorna resultado

### GET /api/v1/orchestrator/sync-data

Sincroniza datos desde binance-proxy hacia binance-db-api. Diseñado para ser llamado desde un cronjob.

**Query Parameters:**
- `symbol` (optional): Trading symbol (e.g., "BTCUSDT")
- `type` (optional): Type of data to sync - enum: `ticker`, `price`, `klines`

**Validation:**
- `symbol`: Optional, string
- `type`: Optional, one of: `ticker`, `price`, `klines`

**Examples:**
```
GET /api/v1/orchestrator/sync-data
GET /api/v1/orchestrator/sync-data?symbol=BTCUSDT
GET /api/v1/orchestrator/sync-data?symbol=BTCUSDT&type=ticker
GET /api/v1/orchestrator/sync-data?type=price
```

**Response 200:**
```json
{
  "success": true,
  "message": "Synchronized 50 records",
  "recordsCreated": 30,
  "recordsUpdated": 20
}
```

**Error Responses:**
- `400`: Validation error
- `500`: Internal server error

**Flow:**
1. Obtiene datos desde binance-proxy según parámetros
2. Para cada registro:
   - Intenta guardar nuevo registro
   - Si falla (duplicado), cuenta como actualizado
3. Retorna resumen de sincronización

### POST /api/v1/orchestrator/bridge-webhook

Recibe webhooks del exchanger-bridge y los procesa.

**Request Body:**
```json
{
  // Estructura según especificación del exchanger-bridge
  // Por ahora, acepta cualquier objeto JSON
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

**Error Responses:**
- `400`: Invalid request
- `500`: Internal server error

**Note:** La lógica de procesamiento específica depende de la especificación del exchanger-bridge y debe implementarse según los requisitos.

## Documentation Endpoints

### GET /api-docs

Swagger UI para documentación interactiva de la API.

### GET /api-docs.json

OpenAPI specification en formato JSON.

## Códigos de Estado HTTP

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Formato de Errores

**Error Response:**
```json
{
  "error": "Error message",
  "details": ["Validation error details"] // Solo en 400
}
```

**Development Mode:**
```json
{
  "error": "Error message",
  "stack": "Error stack trace" // Solo en desarrollo
}
```

## Rate Limiting

Actualmente no hay rate limiting implementado. Considerar implementar si es necesario.

## Autenticación

Actualmente no hay autenticación requerida. Considerar agregar si es necesario para producción.

## Versionado

La API usa versionado en la ruta: `/api/v1/`. Para futuras versiones, usar `/api/v2/`, etc.

