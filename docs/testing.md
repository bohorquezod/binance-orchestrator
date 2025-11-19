# Testing y Calidad de Código

## Estrategia de Testing

### Pirámide de Testing

```
        /\
       /  \      E2E Tests (futuro)
      /____\
     /      \    Integration Tests
    /________\
   /          \  Unit Tests (mayoría)
  /____________\
```

### Tipos de Tests

#### Unit Tests
- **Ubicación**: `tests/unit/`
- **Propósito**: Probar funciones y clases individuales
- **Mocks**: Todos los servicios externos deben ser mockeados
- **Cobertura objetivo**: >80%

#### Integration Tests
- **Ubicación**: `tests/integration/`
- **Propósito**: Probar flujos completos con servicios externos
- **Flag**: `RUN_INTEGRATION_TESTS=true` para ejecutar
- **Cuidado**: No ejecutar en CI por defecto (requieren servicios externos)

## Configuración de Jest

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    // ... otros path aliases
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Estructura de Tests

### Estructura de Carpetas

```
tests/
├── unit/
│   ├── services/
│   │   ├── csv-processor.service.test.ts
│   │   ├── file-storage.service.test.ts
│   │   └── ...
│   ├── controllers/
│   │   ├── orchestrator.controller.test.ts
│   │   └── ...
│   └── utils/
│       └── ...
├── integration/
│   ├── csv-processing.test.ts
│   ├── data-sync.test.ts
│   └── ...
├── mocks/
│   ├── http-client.mock.ts
│   └── ...
└── setup.ts
```

### Ejemplo de Unit Test

```typescript
// tests/unit/services/csv-processor.service.test.ts
import { CsvProcessorService } from '@services/csv-processor.service';
import { fileStorageService } from '@services/file-storage.service';
import { binanceDbService } from '@services/binance-db.service';

jest.mock('@services/file-storage.service');
jest.mock('@services/binance-db.service');

describe('CsvProcessorService', () => {
  let service: CsvProcessorService;

  beforeEach(() => {
    service = new CsvProcessorService();
    jest.clearAllMocks();
  });

  describe('parseCsv', () => {
    it('should parse valid CSV content', async () => {
      const csvContent = 'name,age\nJohn,30\nJane,25';
      const result = await service.parseCsv(csvContent);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ name: 'John', age: 30 });
    });

    it('should throw error for empty CSV', async () => {
      await expect(service.parseCsv('')).rejects.toThrow('CSV file is empty');
    });
  });

  describe('processAndSave', () => {
    it('should process CSV and save to database', async () => {
      const fileId = 'file-123';
      const csvContent = 'symbol,price\nBTCUSDT,45000';
      
      (fileStorageService.getCsvFile as jest.Mock).mockResolvedValue(csvContent);
      (binanceDbService.saveBulkData as jest.Mock).mockResolvedValue({});

      const result = await service.processAndSave(fileId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(fileStorageService.getCsvFile).toHaveBeenCalledWith(fileId);
      expect(binanceDbService.saveBulkData).toHaveBeenCalled();
    });
  });
});
```

### Ejemplo de Integration Test

```typescript
// tests/integration/csv-processing.test.ts
import request from 'supertest';
import app from '@app';

describe('CSV Processing Integration', () => {
  beforeAll(() => {
    // Setup: verificar que servicios externos estén disponibles
    if (!process.env.RUN_INTEGRATION_TESTS) {
      return;
    }
  });

  it('should process CSV end-to-end', async () => {
    const response = await request(app)
      .post('/api/v1/orchestrator/process-csv')
      .send({ fileId: 'test-file-id' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.recordsProcessed).toBeGreaterThan(0);
  });
});
```

## Mocks

### HTTP Client Mock

```typescript
// tests/mocks/http-client.mock.ts
import { IHttpClient, HttpResponse } from '@utils/http-client.interface';

export class MockHttpClient implements IHttpClient {
  private responses: Map<string, HttpResponse<unknown>> = new Map();

  setResponse(url: string, response: HttpResponse<unknown>): void {
    this.responses.set(url, response);
  }

  async request<T = unknown>(config: { method: string; url: string }): Promise<HttpResponse<T>> {
    const key = `${config.method} ${config.url}`;
    const response = this.responses.get(key);
    
    if (!response) {
      throw new Error(`No mock response for ${key}`);
    }
    
    return response as HttpResponse<T>;
  }
}
```

## Cobertura de Código

### Objetivos de Cobertura

- **Branches**: >80%
- **Functions**: >80%
- **Lines**: >80%
- **Statements**: >80%

### Generar Reporte

```bash
npm run test:coverage
```

### Ver Reporte

El reporte se genera en `coverage/` y puede visualizarse abriendo `coverage/lcov-report/index.html`.

## Quality Gates

### Pre-commit

Considerar usar husky para:
- Linting (`npm run lint`)
- Type checking (`npm run type-check`)
- Tests (`npm test`)

### CI/CD

En CI/CD pipeline:
1. Lint
2. Type check
3. Unit tests
4. Coverage check
5. Build

## Testing de Servicios Externos

### Estrategia

- **Unit Tests**: Mockear todos los servicios externos
- **Integration Tests**: Usar servicios reales (con flag)
- **Staging**: Probar con servicios de staging

### Mocking de Servicios

```typescript
// En tests
jest.mock('@services/file-storage.service', () => ({
  fileStorageService: {
    getCsvFile: jest.fn(),
  },
}));
```

## Best Practices

### ✅ DO

- ✅ Escribir tests antes o junto con el código
- ✅ Usar nombres descriptivos para tests
- ✅ Un test = una aserción principal
- ✅ Mockear dependencias externas
- ✅ Limpiar mocks entre tests
- ✅ Probar casos de error
- ✅ Probar casos límite

### ❌ DON'T

- ❌ NO probar implementación, probar comportamiento
- ❌ NO hacer tests dependientes entre sí
- ❌ NO usar datos reales de producción
- ❌ NO hacer tests lentos innecesariamente
- ❌ NO ignorar tests que fallan

## Debugging Tests

### Ejecutar un Test Específico

```bash
npm test -- csv-processor.service.test.ts
```

### Watch Mode

```bash
npm run test:watch
```

### Verbose Output

```bash
npm test -- --verbose
```

## Futuras Mejoras

- [ ] Agregar E2E tests
- [ ] Agregar performance tests
- [ ] Agregar contract tests para servicios externos
- [ ] Agregar mutation testing
- [ ] Mejorar cobertura de edge cases

