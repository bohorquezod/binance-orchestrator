# Dependencias del Proyecto

## Dependencias de Producción

### Core Framework

- **express** (^4.18.2)
  - Framework web para Node.js
  - Manejo de routing y middlewares
  - Uso: Configuración de servidor HTTP

- **typescript** (^5.3.3)
  - Compilador TypeScript
  - Type safety y desarrollo moderno
  - Uso: Compilación de código TypeScript

### HTTP y Networking

- **axios** (^1.6.2)
  - Cliente HTTP para Node.js
  - Abstraído en `IHttpClient` para facilitar cambio
  - Uso: Comunicación con servicios externos

- **cors** (^2.8.5)
  - Middleware para CORS
  - Uso: Habilitar CORS en Express

### Seguridad

- **helmet** (^7.1.0)
  - Middleware de seguridad HTTP
  - Headers de seguridad
  - Uso: Protección de headers HTTP

### Validación

- **express-validator** (^7.0.1)
  - Validación de entrada HTTP
  - Uso: Validación de requests en controllers

### Procesamiento de Datos

- **csv-parse** (^6.1.0)
  - Parser de CSV
  - Uso: Procesamiento de archivos CSV

### Logging

- **winston** (^3.11.0)
  - Logger estructurado
  - Uso: Logging de aplicación

### Documentación

- **swagger-jsdoc** (^6.2.8)
  - Generación de documentación OpenAPI desde comentarios JSDoc
  - Uso: Generación de spec OpenAPI

- **swagger-ui-express** (^5.0.0)
  - UI de Swagger para Express
  - Uso: Interfaz de documentación interactiva

### Configuración

- **dotenv** (^16.3.1)
  - Carga de variables de entorno desde .env
  - Uso: Configuración de entorno

## Dependencias de Desarrollo

### TypeScript

- **@types/node** (^20.10.5)
  - Type definitions para Node.js
  - Uso: Tipos de Node.js

- **@types/express** (^4.17.21)
  - Type definitions para Express
  - Uso: Tipos de Express

- **@types/cors** (^2.8.17)
  - Type definitions para CORS
  - Uso: Tipos de CORS

- **@types/swagger-jsdoc** (^6.0.4)
  - Type definitions para swagger-jsdoc
  - Uso: Tipos de swagger-jsdoc

- **@types/swagger-ui-express** (^4.1.6)
  - Type definitions para swagger-ui-express
  - Uso: Tipos de swagger-ui-express

### Testing

- **jest** (^29.7.0)
  - Framework de testing
  - Uso: Tests unitarios e integración

- **@types/jest** (^29.5.11)
  - Type definitions para Jest
  - Uso: Tipos de Jest

- **ts-jest** (^29.1.1)
  - Preset de Jest para TypeScript
  - Uso: Compilación de TypeScript en tests

- **supertest** (^6.3.3)
  - Testing de HTTP endpoints
  - Uso: Tests de integración de API

- **@types/supertest** (^6.0.2)
  - Type definitions para Supertest
  - Uso: Tipos de Supertest

### Linting y Code Quality

- **eslint** (^9.14.0)
  - Linter de JavaScript/TypeScript
  - Uso: Análisis estático de código

- **@eslint/js** (^9.39.1)
  - Configuración base de ESLint
  - Uso: Reglas base de ESLint

- **typescript-eslint** (^8.46.3)
  - ESLint para TypeScript
  - Uso: Linting de TypeScript

- **@typescript-eslint/eslint-plugin** (^8.46.3)
  - Plugin de ESLint para TypeScript
  - Uso: Reglas específicas de TypeScript

- **@typescript-eslint/parser** (^8.46.3)
  - Parser de ESLint para TypeScript
  - Uso: Parsing de TypeScript en ESLint

- **globals** (^16.5.0)
  - Globales para ESLint
  - Uso: Definición de globales en ESLint

### Build Tools

- **ts-node-dev** (^2.0.0)
  - Desarrollo con hot reload
  - Uso: Script `dev` para desarrollo

- **tsc-alias** (^1.8.10)
  - Resolución de path aliases después de compilación
  - Uso: Build de TypeScript con path aliases

- **tsconfig-paths** (^4.2.0)
  - Resolución de path aliases en runtime
  - Uso: Desarrollo con path aliases

- **jiti** (^2.6.1)
  - Runtime TypeScript loader
  - Uso: Carga de archivos TypeScript en runtime

## Gestión de Dependencias

### Instalación

```bash
npm install
```

### Actualización

```bash
npm update
```

### Auditoría de Seguridad

```bash
npm audit
npm audit fix
```

## Política de Versiones

- **Producción**: Versiones exactas o con `^` para permitir patches y minor updates
- **Desarrollo**: Versiones con `^` para permitir actualizaciones
- **TypeScript**: Versión específica para consistencia
- **Node.js**: Versión 20.x (definida en `.nvmrc`)

## Dependencias de Servicios Externos

### file-storage-api

- **Protocolo**: HTTP
- **Base URL**: Configurado vía `FILE_STORAGE_API_URL`
- **Endpoints usados**:
  - `GET /api/files/{fileId}`

### binance-db-api

- **Protocolo**: HTTP
- **Base URL**: Configurado vía `BINANCE_DB_API_URL`
- **Endpoints usados**:
  - `GET /api/v1/transactions`
  - `POST /api/v1/transactions`
  - `POST /api/v1/transactions/bulk`
  - `PATCH /api/v1/transactions/{id}`

### binance-proxy

- **Protocolo**: HTTP
- **Base URL**: Configurado vía `BINANCE_PROXY_URL`
- **Endpoints usados**:
  - `GET /api/v1/market/ticker/24hr`
  - `GET /api/v1/market/ticker/price`
  - `GET /api/v1/market/klines`

### exchanger-bridge

- **Protocolo**: HTTP (webhooks)
- **Endpoints usados**:
  - `POST /api/v1/orchestrator/bridge-webhook` (recibe)

## Consideraciones de Seguridad

- Todas las dependencias deben estar actualizadas
- Revisar `npm audit` regularmente
- No usar dependencias con vulnerabilidades conocidas
- Considerar usar `npm ci` en CI/CD para builds reproducibles

