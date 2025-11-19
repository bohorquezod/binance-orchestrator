# Flujos de Datos

## Pipeline de Procesamiento de CSV

### 1. Recepción de Request

```
Client → POST /api/v1/orchestrator/process-csv
Body: { "fileId": "file-123" }
```

### 2. Validación

```typescript
// orchestrator.controller.ts
validateProcessCsv middleware:
- fileId: required, string, not empty
```

### 3. Obtención de CSV

```
orchestrator → file-storage-api
GET /api/files/file-123
Response: CSV content (string)
```

**Error Handling:**
- Si fileId no existe → 404
- Si file-storage-api no responde → 500 con mensaje descriptivo

### 4. Parsing de CSV

```typescript
// csv-processor.service.ts
parseCsv(csvContent: string):
- Usa csv-parse con opciones:
  - columns: true (primera línea como headers)
  - skip_empty_lines: true
  - trim: true
  - cast: convierte números automáticamente
- Retorna: { headers: string[], rows: CsvRow[] }
```

**Transformación de Tipos:**
- Strings numéricos → Numbers
- Strings vacíos → Mantiene como string
- Headers → Se mantienen como están

### 5. Transformación a Formato DB

```typescript
// csv-processor.service.ts
transformToDbFormat(parsedData):
- Normaliza nombres de columnas:
  - lowercase
  - espacios → underscores
- Agrega metadata:
  - processed_at: ISO timestamp
  - source: 'csv_import'
- Retorna: Record<string, unknown>[]
```

**Ejemplo de Transformación:**
```typescript
// CSV Input:
{
  "Symbol": "BTCUSDT",
  "Price": "45000",
  "Volume": "100.5"
}

// DB Output:
{
  "symbol": "BTCUSDT",
  "price": 45000,
  "volume": 100.5,
  "processed_at": "2024-01-01T00:00:00.000Z",
  "source": "csv_import"
}
```

### 6. Guardado en Base de Datos

```
orchestrator → binance-db-api
POST /api/v1/transactions/bulk
Body: { transactions: [...] }
```

**Error Handling:**
- Si binance-db-api no responde → 500
- Si hay errores de validación en DB → 400 con detalles

### 7. Response

```json
{
  "success": true,
  "message": "Successfully processed 100 records",
  "recordsProcessed": 100
}
```

## Pipeline de Sincronización de Datos

### 1. Recepción de Request

```
Cronjob → GET /api/v1/orchestrator/sync-data?symbol=BTCUSDT&type=ticker
```

### 2. Validación

```typescript
// orchestrator.controller.ts
validateSyncData middleware:
- symbol: optional, string
- type: optional, enum: ['ticker', 'price', 'klines']
```

### 3. Obtención de Datos desde Proxy

```typescript
// binance-proxy.service.ts
if (type === 'ticker' || !type):
  getTicker24hr(symbol)
  → GET /api/v1/market/ticker/24hr?symbol=BTCUSDT

if (type === 'price'):
  getSymbolPrice(symbol)
  → GET /api/v1/market/ticker/price?symbol=BTCUSDT
```

**Response del Proxy:**
```json
[
  {
    "symbol": "BTCUSDT",
    "priceChange": "100.00",
    "priceChangePercent": "0.22",
    "lastPrice": "45000.00",
    ...
  }
]
```

### 4. Procesamiento de Datos

```typescript
// orchestrator.controller.ts
- Convierte respuesta a array si es necesario
- Para cada item:
  - Intenta guardar: binanceDbService.saveData(item)
  - Si falla (duplicado), cuenta como actualizado
```

### 5. Guardado/Actualización

```
orchestrator → binance-db-api
POST /api/v1/transactions
Body: { ...item }
```

**Estrategia de Actualización:**
- Actualmente: Intenta guardar, si falla cuenta como actualizado
- Futuro: Implementar lógica de comparación y actualización real

### 6. Response

```json
{
  "success": true,
  "message": "Synchronized 50 records",
  "recordsCreated": 30,
  "recordsUpdated": 20
}
```

## Pipeline de Webhook

### 1. Recepción de Webhook

```
exchanger-bridge → POST /api/v1/orchestrator/bridge-webhook
Body: { ...webhook payload }
```

### 2. Procesamiento

```typescript
// orchestrator.controller.ts
bridgeWebhook():
- Recibe payload del bridge
- Logs el webhook recibido
- TODO: Implementar lógica específica según especificación del bridge
```

### 3. Coordinación con Servicios

**Pendiente de implementar según especificación del bridge:**
- Posiblemente actualizar binance-db-api
- Posiblemente notificar otros servicios
- Posiblemente procesar transacciones

### 4. Response

```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

## Validaciones

### Validación de Entrada

**Express-Validator:**
- Todos los endpoints validan entrada
- Errores de validación retornan 400 con detalles

**Ejemplo:**
```typescript
body('fileId')
  .notEmpty()
  .withMessage('fileId is required')
  .isString()
  .withMessage('fileId must be a string')
```

### Validación de Datos CSV

**En parseCsv:**
- Verifica que CSV no esté vacío
- Verifica que tenga al menos una fila de datos
- Valida que headers existan

### Validación de Respuestas de Servicios Externos

**En servicios:**
- Verifica que respuesta sea del tipo esperado
- Maneja errores HTTP (404, 500, etc.)
- Transforma errores a mensajes descriptivos

## Mapeos de Datos

### CSV → Database

**Reglas de Mapeo:**
1. Normalización de nombres:
   - Lowercase
   - Espacios → underscores
   - Caracteres especiales → mantener (o normalizar según necesidad)

2. Conversión de tipos:
   - Strings numéricos → Numbers
   - Fechas → ISO strings
   - Booleanos → Boolean

3. Metadata agregada:
   - `processed_at`: Timestamp de procesamiento
   - `source`: Origen de los datos ('csv_import')

### Proxy Data → Database

**Reglas de Mapeo:**
- Datos del proxy se guardan tal cual (estructura depende del endpoint)
- Posible agregación de metadata según necesidad
- Normalización de nombres si es necesario

## Manejo de Errores

### Errores de Servicios Externos

**Estrategia:**
1. Capturar error HTTP
2. Loggear error con contexto
3. Transformar a error descriptivo
4. Lanzar error para que middleware lo maneje

**Ejemplo:**
```typescript
try {
  const csv = await fileStorageService.getCsvFile(fileId);
} catch (error) {
  if (httpError.status === 404) {
    throw new Error(`File not found: ${fileId}`);
  }
  throw new Error(`Failed to fetch CSV file: ${httpError.message}`);
}
```

### Errores Parciales

**En sync-data:**
- Si un registro falla, continúa con los demás
- Cuenta registros creados vs actualizados
- Retorna resumen incluso si hay errores parciales

## Logging

### Puntos de Logging

1. **Request recibido**: Controller logs request
2. **Llamada a servicio externo**: Service logs antes de llamar
3. **Respuesta recibida**: Service logs después de recibir
4. **Errores**: Todos los errores se loggean con contexto
5. **Procesamiento**: Logs de progreso en flujos largos

### Formato de Logs

```typescript
logger.info('Processing CSV request', { fileId });
logger.error('Error fetching CSV file', { fileId, error: err.message });
```

