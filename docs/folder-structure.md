# Estructura de Carpetas

## Estructura Completa

```
binance-orchestrator/
├── src/
│   ├── config/              # Configuraciones
│   │   ├── env.config.ts    # Carga de variables de entorno
│   │   ├── services.config.ts # Configuración de servicios externos
│   │   └── swagger.config.ts  # Configuración de Swagger/OpenAPI
│   ├── controllers/         # Controladores de endpoints
│   │   ├── orchestrator.controller.ts
│   │   └── health.controller.ts
│   ├── services/            # Lógica de negocio
│   │   ├── file-storage.service.ts
│   │   ├── binance-db.service.ts
│   │   ├── binance-proxy.service.ts
│   │   └── csv-processor.service.ts
│   ├── middleware/          # Middlewares
│   │   └── error.middleware.ts
│   ├── types/               # Tipos TypeScript
│   │   └── orchestrator.types.ts
│   ├── utils/               # Utilidades
│   │   ├── logger.ts
│   │   ├── http-client.interface.ts
│   │   ├── http-client.ts
│   │   └── axios-http-client.ts
│   └── app.ts               # Configuración Express
├── docs/                    # Documentación
│   ├── README.md
│   ├── architecture.md
│   ├── endpoints.md
│   ├── data-flow.md
│   ├── dependencies.md
│   ├── conventions.md
│   ├── folder-structure.md
│   ├── testing.md
│   ├── deployment.md
│   └── versioning.md
├── .cursorrules/            # Cursor rules
│   ├── architecture.mdc
│   ├── conventions.mdc
│   ├── services.mdc
│   ├── testing.mdc
│   └── docs.mdc
├── logs/                    # Logs (gitkeep, .log files ignored)
├── dist/                    # Build output (generated, ignored in git)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── .nvmrc
├── .gitignore
└── README.md
```

## Descripción de Carpetas

### src/

Código fuente principal de la aplicación.

#### src/config/

Configuraciones centralizadas:
- **env.config.ts**: Carga automática de variables de entorno
- **services.config.ts**: URLs y timeouts de servicios externos
- **swagger.config.ts**: Configuración de documentación OpenAPI

#### src/controllers/

Controladores HTTP que manejan requests y responses:
- **orchestrator.controller.ts**: Endpoints principales de orquestación
- **health.controller.ts**: Health check endpoint

**Reglas:**
- Solo routing, validación y delegación a servicios
- No lógica de negocio
- Validación con express-validator

#### src/services/

Servicios con lógica de negocio:
- **file-storage.service.ts**: Comunicación con file-storage-api
- **binance-db.service.ts**: Comunicación con binance-db-api
- **binance-proxy.service.ts**: Comunicación con binance-proxy
- **csv-processor.service.ts**: Procesamiento de CSV

**Reglas:**
- Toda la lógica de negocio aquí
- Comunicación con servicios externos
- Exportar como singleton

#### src/middleware/

Middlewares de Express:
- **error.middleware.ts**: Manejo centralizado de errores

#### src/types/

Tipos TypeScript:
- **orchestrator.types.ts**: Tipos relacionados con orquestación

**Reglas:**
- Todos los tipos públicos aquí
- No tipos inline en funciones públicas

#### src/utils/

Utilidades reutilizables:
- **logger.ts**: Configuración de Winston logger
- **http-client.interface.ts**: Interfaz para HTTP client
- **http-client.ts**: Factory y exportaciones
- **axios-http-client.ts**: Implementación con Axios

#### src/app.ts

Configuración principal de Express:
- Middlewares globales
- Routes
- Swagger UI
- Error handlers

**Reglas:**
- Solo configuración, no lógica de negocio

### docs/

Documentación del proyecto:
- **README.md**: Índice de documentación
- **architecture.md**: Arquitectura del sistema
- **endpoints.md**: Especificación de endpoints
- **data-flow.md**: Flujos de datos
- **dependencies.md**: Dependencias y su propósito
- **conventions.md**: Convenciones de código
- **folder-structure.md**: Este archivo
- **testing.md**: Estrategia de testing
- **deployment.md**: Procesos de despliegue
- **versioning.md**: Estándares de versionado

### .cursorrules/

Reglas de Cursor para mantener consistencia:
- **architecture.mdc**: Reglas de arquitectura
- **conventions.mdc**: Reglas de convenciones
- **services.mdc**: Reglas de servicios
- **testing.mdc**: Reglas de testing
- **docs.mdc**: Reglas de documentación

### logs/

Directorio para logs:
- `combined.log`: Todos los logs
- `error.log`: Solo errores
- `.log` files ignorados en git

### dist/

Output de compilación TypeScript:
- Generado por `npm run build`
- Ignorado en git

## Reglas de Estructura

### ✅ DO

- ✅ Mantener estructura de carpetas consistente
- ✅ Agrupar código por responsabilidad
- ✅ Usar path aliases para imports
- ✅ Colocar tipos en `src/types/`
- ✅ Colocar servicios en `src/services/`
- ✅ Colocar controllers en `src/controllers/`

### ❌ DON'T

- ❌ NO crear archivos sueltos en `src/`
- ❌ NO mezclar lógica de negocio en controllers
- ❌ NO poner tipos inline en funciones públicas
- ❌ NO crear carpetas fuera de la estructura definida
- ❌ NO mezclar responsabilidades (ej: validación en servicios)
- ❌ NO poner código de negocio en `app.ts`

## Agregar Nuevas Carpetas

Si necesitas agregar una nueva carpeta:

1. **Actualizar este documento** con la nueva estructura
2. **Actualizar `.cursorrules/architecture.mdc`** con las reglas
3. **Actualizar `docs/README.md`** si es necesario
4. **Mantener consistencia** con el resto del proyecto

