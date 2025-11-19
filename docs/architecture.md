# Arquitectura del Sistema

## Arquitectura de Alto Nivel

Binance Orchestrator actúa como un **orquestador central** que coordina la comunicación entre múltiples microservicios. Su función principal es:

1. **Procesar archivos CSV**: Obtener CSV de file-storage-api, procesarlos y guardarlos en binance-db-api
2. **Sincronizar datos**: Obtener datos actualizados de binance-proxy y actualizar binance-db-api
3. **Manejar webhooks**: Recibir y procesar webhooks de exchanger-bridge

```
┌─────────────────┐
│   Client/API    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Binance Orchestrator            │
│  ┌───────────────────────────────┐ │
│  │   Controllers Layer           │ │
│  │  - orchestrator.controller    │ │
│  │  - health.controller         │ │
│  └───────────┬───────────────────┘ │
│              │                      │
│  ┌───────────▼───────────────────┐ │
│  │   Services Layer               │ │
│  │  - csv-processor.service      │ │
│  │  - file-storage.service       │ │
│  │  - binance-db.service         │ │
│  │  - binance-proxy.service      │ │
│  └───────────┬───────────────────┘ │
│              │                      │
│  ┌───────────▼───────────────────┐ │
│  │   HTTP Client Layer            │ │
│  │  - IHttpClient (interface)    │ │
│  │  - AxiosHttpClient            │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│file-storage │ │binance-db │ │binance-  │ │exchanger- │
│    -api     │ │   -api    │ │  proxy   │ │  bridge   │
└─────────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Capas Arquitectónicas

### 1. Controllers Layer

**Responsabilidades:**
- Recibir requests HTTP
- Validar entrada con express-validator
- Delegar lógica de negocio a servicios
- Formatear respuestas HTTP
- Manejar errores y delegarlos al middleware

**Componentes:**
- **orchestrator.controller.ts**: Endpoints principales de orquestación
  - `processCsv`: Procesa CSV desde file-storage-api
  - `syncData`: Sincroniza datos desde binance-proxy
  - `bridgeWebhook`: Recibe webhooks de exchanger-bridge
- **health.controller.ts**: Health check endpoint

### 2. Services Layer

**Responsabilidades:**
- Lógica de negocio
- Orquestación de múltiples servicios externos
- Transformación de datos
- Manejo de errores de servicios externos

**Componentes:**

#### CsvProcessorService
- **parseCsv**: Parsea contenido CSV a estructura de datos
- **transformToDbFormat**: Transforma datos CSV al formato esperado por binance-db-api
- **processAndSave**: Flujo completo: obtener → parsear → transformar → guardar

#### FileStorageService
- **getCsvFile**: Obtiene CSV desde file-storage-api
- **getFileMetadata**: Obtiene metadata de archivos

#### BinanceDbService
- **queryData**: Consulta datos desde binance-db-api
- **saveData**: Guarda un registro
- **saveBulkData**: Guarda múltiples registros en bulk
- **updateData**: Actualiza un registro existente

#### BinanceProxyService
- **getMarketData**: Obtiene datos de mercado desde binance-proxy
- **getAccountData**: Obtiene datos de cuenta (requiere autenticación)
- **getTicker24hr**: Método helper para ticker 24hr
- **getSymbolPrice**: Método helper para precio de símbolo
- **getKlines**: Método helper para klines/candlesticks

### 3. HTTP Client Layer (Abstraction)

**Responsabilidades:**
- Abstracción de la librería HTTP
- Interfaz unificada para requests
- Facilita cambio de librería (axios → fetch, etc.)

**Componentes:**
- **IHttpClient**: Interfaz que define el contrato
- **AxiosHttpClient**: Implementación actual usando Axios
- **createHttpClient**: Factory function para crear instancias

### 4. External Services

#### file-storage-api
- Almacena y recupera archivos CSV
- Endpoint: `GET /api/files/{fileId}`

#### binance-db-api
- Base de datos para datos de Binance
- Endpoints:
  - `GET /api/v1/transactions` - Consultar
  - `POST /api/v1/transactions` - Guardar uno
  - `POST /api/v1/transactions/bulk` - Guardar múltiples
  - `PATCH /api/v1/transactions/{id}` - Actualizar

#### binance-proxy
- Proxy para API de Binance
- Endpoints:
  - `GET /api/v1/market/ticker/24hr` - Ticker 24hr
  - `GET /api/v1/market/ticker/price` - Precio de símbolo
  - `GET /api/v1/market/klines` - Klines/candlesticks

#### exchanger-bridge
- Bridge para intercambios
- Envía webhooks a: `POST /api/v1/orchestrator/bridge-webhook`

## Flujo de Datos

### CSV Processing Flow

1. **Request** → `POST /api/v1/orchestrator/process-csv` con `{ fileId }`
2. **Controller** → Valida entrada, llama a `csvProcessorService.processAndSave()`
3. **CsvProcessorService** → Orquesta el flujo completo:
   - Llama a `fileStorageService.getCsvFile(fileId)`
   - Parsea CSV con `parseCsv()`
   - Transforma datos con `transformToDbFormat()`
   - Guarda con `binanceDbService.saveBulkData()`
4. **Response** → Retorna resultado con conteo de registros procesados

### Data Synchronization Flow

1. **Request** → `GET /api/v1/orchestrator/sync-data?symbol=BTCUSDT&type=ticker`
2. **Controller** → Valida query params, llama a `syncData()`
3. **Service** → Obtiene datos de `binanceProxyService.getTicker24hr()`
4. **Service** → Guarda/actualiza en `binanceDbService.saveData()` o `updateData()`
5. **Response** → Retorna resumen de sincronización

### Webhook Flow

1. **Request** → `POST /api/v1/orchestrator/bridge-webhook` con payload del bridge
2. **Controller** → Recibe webhook, procesa según especificación del bridge
3. **Service** → Coordina acciones necesarias con otros servicios
4. **Response** → Confirma recepción y procesamiento

### Error Flow

1. Error ocurre en cualquier capa (service, HTTP client, etc.)
2. Error es capturado y transformado
3. Error middleware procesa y formatea
4. Response HTTP con código de error apropiado

## Patrones Arquitectónicos

### 1. Service Layer Pattern

Los servicios encapsulan toda la lógica de negocio y comunicación externa. Los controladores solo orquestan.

### 2. Dependency Injection

Los servicios pueden recibir dependencias (como HTTP client) para facilitar testing.

### 3. Interface Segregation

El `IHttpClient` define una interfaz mínima necesaria, permitiendo diferentes implementaciones.

### 4. Singleton Pattern

Los servicios se exportan como instancias singleton para reutilización.

### 5. Factory Pattern

`createHttpClient` actúa como factory para crear instancias de HTTP client con configuración específica.

## Configuración

### Environment Variables

- `PORT`: Puerto del servidor (default: 3000)
- `NODE_ENV`: Entorno (development, production, test)
- `FILE_STORAGE_API_URL`: URL de file-storage-api
- `BINANCE_DB_API_URL`: URL de binance-db-api
- `BINANCE_PROXY_URL`: URL de binance-proxy
- `TRAEFIK_PREFIX`: Prefijo para Traefik (default: /binance-orchestrator)
- `DOMAIN`: Dominio para Traefik
- `LOG_LEVEL`: Nivel de logging (default: info)

### Service Configuration

La configuración de servicios externos está centralizada en `src/config/services.config.ts`:

```typescript
{
  fileStorageApi: { baseURL, timeout },
  binanceDbApi: { baseURL, timeout },
  binanceProxy: { baseURL, timeout }
}
```

## Seguridad

- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configuración de CORS
- **Input Validation**: express-validator en todos los endpoints
- **Error Handling**: No exponer información sensible en errores

## Logging

- **Winston**: Logging estructurado
- **Logs**: `logs/combined.log` y `logs/error.log`
- **Console**: En desarrollo
- **Structured Logging**: JSON en producción

