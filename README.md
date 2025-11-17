## MCP - Binance DB API

Este proyecto contiene un servidor MCP completo que publica la documentación de Binance DB API para consumirla desde clientes compatibles con Model Context Protocol.

### Requisitos previos

- Node.js 20.x (si deseas ejecutarlo fuera de Docker).

### Desarrollo local

```bash
cd binance-db-api-mcp
npm install
npm run dev
```

Variables de entorno reconocidas:

- `BINANCE_DB_API_URL`: URL base de la API (incluyendo el prefijo, por defecto `http://localhost:3000/api`).
- `OPENAPI_SPEC_URL`: Ruta absoluta al JSON de OpenAPI (por defecto `${BINANCE_DB_API_URL}/api-docs.json`).
- `DB_SCHEMA_URL`: Endpoint JSON con la documentación dinámica del esquema (`${BINANCE_DB_API_URL}/db/schema` por defecto).
- `BINANCE_DB_API_TRANSPORT`: Modo de transporte (`stdio` o `http`, por defecto `http`).
- `BINANCE_DB_API_HTTP_HOST`: Host para el servidor HTTP (por defecto `0.0.0.0`).
- `BINANCE_DB_API_HTTP_PORT`: Puerto para el servidor HTTP (por defecto `8080`).
- `BINANCE_DB_API_HTTP_PATH`: Path base para el servidor HTTP (por defecto `/`).
- `BINANCE_DB_API_HTTP_HEALTH_PATH`: Path para el health check (por defecto `/health`).

### Construcción y ejecución con Docker

```bash
cd binance-db-api-mcp
docker build -t binance-db-api-mcp .
docker run --rm -it \
  -e BINANCE_DB_API_URL=http://host.docker.internal:3000/api \
  -p 8080:8080 \
  binance-db-api-mcp
```

> Nota: Al levantar todo con `docker-compose` en la raíz del proyecto `binance-db-api`, el servicio `binance-db-api-mcp` se construye automáticamente y consume la especificación expuesta por el contenedor principal.

### Configuración para clientes MCP

El archivo `binance-db-api.json` sirve como plantilla de configuración:

- `command`: ejecutable a lanzar (`node` por defecto).
- `args`: ruta al `server.js` compilado (`./binance-db-api-mcp/dist/server.js`).
- `env`: variables mínimas para apuntar a tu despliegue (`BINANCE_DB_API_URL`, `OPENAPI_SPEC_URL`, `DB_SCHEMA_URL`).

Adáptalo según tu entorno de ejecución y apunta tu cliente MCP hacia el endpoint expuesto por este servidor.

### Herramientas disponibles

Además de las utilidades para explorar la API HTTP (`search-endpoint`, `get-endpoint-details`, etc.), el servidor expone herramientas de base de datos:

- `list-tables`: listado resumido de tablas con conteo de columnas y relaciones.
- `get-table-details`: definición completa de una tabla (columnas, índices, relaciones).
- `list-table-relations`: relaciones salientes de una tabla concreta.
- `get-schema-mermaid`: diagrama ER en formato Mermaid generado al vuelo.

### Arquitectura

El proyecto sigue una arquitectura modular:

- `src/config.ts`: Manejo de configuración desde variables de entorno
- `src/apiClient.ts`: Cliente HTTP para consumir la API de Binance DB API
- `src/mcpServer.ts`: Lógica del servidor MCP con handlers de recursos y herramientas
- `src/httpServer.ts`: Servidor HTTP para transporte HTTP (opcional)
- `src/server.ts`: Punto de entrada principal que orquesta todo

