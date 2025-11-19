# Convenciones del Proyecto

## Convenciones de Código

### TypeScript

#### Tipado
- ✅ **Siempre tipado explícito** de parámetros y retornos
- ✅ **Nunca usar `any`** - usar `unknown` si es absolutamente necesario
- ✅ **Tipos complejos** siempre en `src/types/`
- ✅ **Tipos exportados** con nombres descriptivos

#### Imports
- ✅ **Siempre usar path aliases** (`@config/`, `@services/`, etc.)
- ❌ **Nunca usar imports relativos** (`../../../`)
- ✅ **Orden de imports**: 
  1. Node.js built-ins
  2. Librerías externas
  3. Path aliases (config primero)
  4. Types

**Ejemplo:**
```typescript
import express from 'express';
import { logger } from '@utils/logger';
import '@config/env.config';
import type { ProcessCsvRequest } from '@/types/orchestrator.types';
```

#### Naming
- **Archivos**: camelCase (`orchestrator.controller.ts`)
- **Clases**: PascalCase (`CsvProcessorService`)
- **Funciones/Variables**: camelCase (`processAndSave`)
- **Constantes**: UPPER_SNAKE_CASE (`FILE_STORAGE_API_URL`)
- **Types/Interfaces**: PascalCase (`ProcessCsvRequest`)
- **Test Files**: `*.test.ts` (no `.spec.ts`)

### Estructura de Archivos

#### Controllers
- Un controller por dominio funcional
- Solo routing, validación, delegación a servicios
- No lógica de negocio
- Validación con express-validator

**Ejemplo:**
```typescript
export const processCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation error', details: errors.array() });
      return;
    }
    
    const result = await csvProcessorService.processAndSave(fileId);
    res.json(result);
  } catch (error) {
    next(error as Error);
  }
};
```

#### Services
- Toda la lógica de negocio
- Comunicación con servicios externos
- Transformación de datos
- Exportar como singleton

**Ejemplo:**
```typescript
export class CsvProcessorService {
  async processAndSave(fileId: string): Promise<{ recordsProcessed: number; success: boolean }> {
    // Business logic here
  }
}

export const csvProcessorService = new CsvProcessorService();
```

#### Types
- Todos los tipos públicos en `src/types/`
- Agrupados por dominio (ej: `orchestrator.types.ts`)
- No tipos inline en funciones públicas
- Usar `type` para aliases, `interface` para objetos extensibles

### Validación

#### Reglas
- ✅ **Siempre validar** toda la entrada del usuario
- ✅ **Usar express-validator** en controllers
- ✅ **No confiar** en validación del cliente
- ✅ **Retornar errores claros** (400 Bad Request)

#### Ejemplos Comunes

**fileId:**
```typescript
body('fileId')
  .notEmpty()
  .withMessage('fileId is required')
  .isString()
  .withMessage('fileId must be a string')
```

**Query params opcionales:**
```typescript
query('symbol')
  .optional()
  .isString()
  .withMessage('symbol must be a string')
```

**Enums:**
```typescript
query('type')
  .optional()
  .isIn(['ticker', 'price', 'klines'])
  .withMessage('type must be one of: ticker, price, klines')
```

### Manejo de Errores

#### Reglas
- ✅ **Siempre usar try/catch** en funciones async
- ✅ **Siempre delegar errores** a middleware con `next(error)`
- ✅ **No capturar y silenciar** errores sin logging
- ✅ **Loggear errores** con contexto suficiente

**Ejemplo:**
```typescript
try {
  const result = await service.doSomething();
  res.json(result);
} catch (error) {
  logger.error('Error in doSomething', { error: (error as Error).message });
  next(error as Error);
}
```

#### Error Middleware
- Centralizado en `src/middleware/error.middleware.ts`
- Mapea errores a códigos HTTP apropiados
- No expone stack traces en producción

### Logging

#### Reglas
- ✅ **Usar logger estructurado** (Winston)
- ✅ **Loggear requests** importantes
- ✅ **Loggear errores** con contexto
- ✅ **No loggear información sensible** (API keys, passwords)

**Ejemplo:**
```typescript
logger.info('Processing CSV request', { fileId });
logger.error('Error fetching CSV file', { fileId, error: err.message });
```

#### Niveles de Logging
- `error`: Errores que requieren atención
- `warn`: Advertencias
- `info`: Información general (default)
- `debug`: Información detallada para debugging

### HTTP Client

#### Reglas
- ✅ **Usar IHttpClient** interface, no axios directamente
- ✅ **Crear instancias** con `createHttpClient()`
- ✅ **Configurar baseURL** y timeout en servicios
- ✅ **Manejar errores HTTP** apropiadamente

**Ejemplo:**
```typescript
const client = createHttpClient(
  config.baseURL,
  config.timeout
);

const response = await client.request<T>({
  method: 'GET',
  url: '/endpoint',
});
```

### Comentarios y Documentación

#### JSDoc
- ✅ **Documentar funciones públicas** con JSDoc
- ✅ **Documentar parámetros** y retornos
- ✅ **Usar @swagger** para documentación de API

**Ejemplo:**
```typescript
/**
 * Processes a CSV file from file-storage-api and saves to binance-db-api
 * @param fileId ID of the CSV file to process
 * @returns Processing result with record count
 */
async processAndSave(fileId: string): Promise<{ recordsProcessed: number; success: boolean }> {
  // ...
}
```

#### Swagger
- ✅ **Documentar todos los endpoints** con Swagger
- ✅ **Incluir ejemplos** de request/response
- ✅ **Especificar códigos de error**

## Convenciones de Git

### Commits
- Usar mensajes descriptivos
- Prefijos opcionales: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

### Branches
- `main`: Código de producción
- `develop`: Desarrollo activo
- `feature/*`: Nuevas funcionalidades
- `fix/*`: Correcciones

## Convenciones de Testing

### Estructura
- Tests unitarios en `tests/unit/`
- Tests de integración en `tests/integration/`
- Mocks en `tests/mocks/`

### Naming
- Archivos: `*.test.ts`
- Describe blocks: Descripción clara del componente
- Test cases: "should ..." o "it should ..."

### Coverage
- Objetivo: >80% de cobertura
- Enfocarse en lógica de negocio
- No necesariamente 100% en utilidades simples

## Convenciones de Docker

### Dockerfile
- Multi-stage build
- Usuario no-root
- Health check configurado
- Optimización de layers

### docker-compose.yml
- Variables de entorno desde `.env`
- Labels de Traefik para reverse proxy
- Health checks configurados
- Volúmenes para logs

