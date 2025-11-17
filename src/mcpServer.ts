import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { ApiClient, OpenAPISpec, DatabaseSchemaDoc, TableDoc } from './apiClient.js';

function searchEndpoints(
  spec: OpenAPISpec,
  query: string,
): Array<{
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
}> {
  const results: Array<{
    path: string;
    method: string;
    summary?: string;
    description?: string;
    tags?: string[];
  }> = [];

  const queryLower = query.toLowerCase();

  if (!spec.paths) {
    return results;
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || operation === null) {
        continue;
      }

      const summary = operation.summary ?? '';
      const description = operation.description ?? '';
      const tags = (operation.tags ?? []).join(' ');

      const searchable = `${path} ${method} ${summary} ${description} ${tags}`.toLowerCase();

      if (searchable.includes(queryLower)) {
        results.push({
          path,
          method: method.toUpperCase(),
          summary,
          description,
          tags: operation.tags ?? [],
        });
      }
    }
  }

  return results;
}

function getEndpointDetails(spec: OpenAPISpec, path: string, method: string) {
  const pathItem = spec.paths[path];
  if (!pathItem) {
    return null;
  }

  const operation = pathItem[method.toLowerCase()];
  if (!operation) {
    return null;
  }

  return {
    path,
    method: method.toUpperCase(),
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
    parameters: operation.parameters,
    requestBody: operation.requestBody,
    responses: operation.responses,
  };
}

function generateCodeExample(endpoint: any, apiBaseUrl: string): string {
  const { path, method, parameters, requestBody } = endpoint;
  const methodUpper = method.toUpperCase();

  let code = `// ${endpoint.summary || endpoint.description || 'Llamada a la API'}\n`;
  code += `// ${methodUpper} ${path}\n\n`;

  if (methodUpper === 'GET') {
    const requiredQueryParams: string[] = [];
    if (Array.isArray(parameters)) {
      for (const param of parameters) {
        if (param.in === 'query' && param.required) {
          requiredQueryParams.push(param.name);
        }
      }
    }

    const queryString =
      requiredQueryParams.length > 0
        ? `?${requiredQueryParams.map((name) => `${name}=valor`).join('&')}`
        : '';

    code += `const response = await fetch(\`${apiBaseUrl}${path}${queryString}\`);\n`;
    code += 'const data = await response.json();\n';
  } else {
    code += `const response = await fetch(\`${apiBaseUrl}${path}\`, {\n`;
    code += `  method: "${methodUpper}",\n`;
    code += '  headers: {\n';
    code += `    "Content-Type": "application/json",\n`;
    code += '  },\n';
    code += '  body: JSON.stringify({\n';

    const properties =
      requestBody?.content?.['application/json']?.schema?.properties ?? {};
    for (const key of Object.keys(properties)) {
      code += `    ${key}: "valor",\n`;
    }

    code += '  }),\n';
    code += '});\n';
    code += 'const data = await response.json();\n';
  }

  code += '\nconsole.log(data);\n';
  return code;
}

function listEndpointsByTag(spec: OpenAPISpec, tag: string) {
  const results: Array<{ path: string; method: string; summary?: string }> = [];

  if (!spec.paths) {
    return results;
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || operation === null) {
        continue;
      }

      const tags: string[] = operation.tags ?? [];
      if (tags.includes(tag)) {
        results.push({
          path,
          method: method.toUpperCase(),
          summary: operation.summary,
        });
      }
    }
  }

  return results;
}

function listTables(doc: DatabaseSchemaDoc) {
  return doc.tables.map((table) => ({
    name: table.name,
    tableName: table.tableName,
    columns: table.columns.length,
    relations: table.relations.length,
    schema: table.schema ?? null,
  }));
}

function getTableDetails(doc: DatabaseSchemaDoc, tableName: string): TableDoc | null {
  const normalized = tableName.toLowerCase();

  return (
    doc.tables.find(
      (table) =>
        table.tableName.toLowerCase() === normalized ||
        table.name.toLowerCase() === normalized,
    ) ?? null
  );
}

function listTableRelations(doc: DatabaseSchemaDoc, tableName: string) {
  const table = getTableDetails(doc, tableName);
  if (!table) {
    return null;
  }

  return table.relations.map((relation) => ({
    from: table.tableName,
    property: relation.propertyName,
    type: relation.type,
    to: relation.targetTable,
    joinColumns: relation.joinColumns,
    inverseSideProperty: relation.inverseSideProperty ?? null,
  }));
}

function normalizeNameForMermaid(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function buildMermaidFromSchema(doc: DatabaseSchemaDoc): string {
  const lines: string[] = ['erDiagram'];

  for (const table of doc.tables) {
    const tableAlias = normalizeNameForMermaid(table.tableName);
    lines.push(`  ${tableAlias} {`);
    for (const column of table.columns) {
      const nullable = column.isNullable ? '' : ' not null';
      lines.push(`    ${column.type} ${column.name}${nullable}`);
    }
    lines.push('  }');
  }

  for (const table of doc.tables) {
    const source = normalizeNameForMermaid(table.tableName);
    for (const relation of table.relations) {
      const target = normalizeNameForMermaid(relation.targetTable);
      let verb = '||--||';
      switch (relation.type) {
        case 'one-to-many':
          verb = '||--{';
          break;
        case 'many-to-one':
          verb = '}--||';
          break;
        case 'many-to-many':
          verb = '}--{';
          break;
        case 'one-to-one':
        default:
          verb = '||--||';
      }
      lines.push(`  ${source} ${verb} ${target} : "${relation.propertyName}"`);
    }
  }

  return lines.join('\n');
}

export function createMcpServer(apiClient: ApiClient): McpServer {
  const mcpServer = new McpServer(
    {
      name: 'binance-db-api-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );
  const server = mcpServer.server;

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const [spec, schemaDoc] = await Promise.all([
        apiClient.fetchOpenAPISpec(),
        apiClient.fetchDatabaseSchema(),
      ]);

      const resources: Array<{
        uri: string;
        name: string;
        description?: string;
        mimeType: string;
      }> = [
        {
          uri: 'openapi://spec',
          name: 'Especificación OpenAPI completa',
          description: spec.info?.description ?? 'OpenAPI de Binance DB API',
          mimeType: 'application/json',
        },
      ];

      if (spec.paths) {
        for (const [path, methods] of Object.entries(spec.paths)) {
          for (const [method, operation] of Object.entries(methods)) {
            const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
            resources.push({
              uri: `openapi://endpoint/${method.toUpperCase()}/${normalizedPath}`,
              name: `${method.toUpperCase()} ${path}`,
              description:
                operation?.summary ?? `Endpoint ${method.toUpperCase()} ${path}`,
              mimeType: 'application/json',
            });
          }
        }
      }

      resources.push({
        uri: 'db://schema',
        name: 'Esquema de base de datos',
        description: 'Descripción estructurada de tablas y relaciones de la base.',
        mimeType: 'application/json',
      });

      for (const table of schemaDoc.tables) {
        const normalized = table.tableName.replace(/^\//, '');
        resources.push({
          uri: `db://table/${normalized}`,
          name: `Tabla ${table.tableName}`,
          description: `${table.columns.length} columnas, ${table.relations.length} relaciones`,
          mimeType: 'application/json',
        });
      }

      return { resources };
    } catch (error) {
      console.error('Error listing resources:', error);
      return { resources: [] };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      if (uri === 'openapi://spec') {
        const spec = await apiClient.fetchOpenAPISpec();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(spec, null, 2),
            },
          ],
        };
      }

      if (uri.startsWith('openapi://endpoint/')) {
        const segments = uri.replace('openapi://endpoint/', '').split('/');
        if (segments.length < 2) {
          throw new Error(`URI de recurso inválido: ${uri}`);
        }

        const [method, ...pathSegments] = segments;
        const path = `/${pathSegments.join('/')}`;

        const spec = await apiClient.fetchOpenAPISpec();
        const endpoint = getEndpointDetails(spec, path, method);

        if (endpoint) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(endpoint, null, 2),
              },
            ],
          };
        }
      }

      if (uri === 'db://schema') {
        const schemaDoc = await apiClient.fetchDatabaseSchema();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(schemaDoc, null, 2),
            },
          ],
        };
      }

      if (uri.startsWith('db://table/')) {
        const tableName = uri.replace('db://table/', '');
        const schemaDoc = await apiClient.fetchDatabaseSchema();
        const table = getTableDetails(schemaDoc, tableName);
        if (table) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(table, null, 2),
              },
            ],
          };
        }
        throw new Error(`Tabla no encontrada: ${tableName}`);
      }

      throw new Error(`Recurso no encontrado: ${uri}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error reading resource: ${message}`);
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search-endpoint',
          description:
            'Busca endpoints en la especificación por path, método, resumen o tags.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: "Texto a buscar (ej. 'bulk', 'processed', 'transactions').",
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get-endpoint-details',
          description: 'Obtiene el detalle completo de un endpoint específico.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: "Ruta del endpoint (ej. '/transactions/bulk').",
              },
              method: {
                type: 'string',
                description: 'Método HTTP (GET, POST, PATCH, ...).',
              },
            },
            required: ['path', 'method'],
          },
        },
        {
          name: 'get-endpoint-code',
          description: 'Genera un ejemplo mínimo en TypeScript para invocar un endpoint.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
              },
              method: {
                type: 'string',
              },
            },
            required: ['path', 'method'],
          },
        },
        {
          name: 'list-endpoints-by-tag',
          description: 'Lista endpoints agrupados por la etiqueta (tag) de OpenAPI.',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Nombre del tag definido en la especificación.',
              },
            },
            required: ['tag'],
          },
        },
        {
          name: 'list-tables',
          description:
            'Lista todas las tablas conocidas del esquema de base de datos con conteo de columnas y relaciones.',
          inputSchema: {
            type: 'object',
            properties: {
              search: {
                type: 'string',
                description:
                  'Filtro opcional para el nombre de la tabla (coincidencia parcial, insensible a mayúsculas).',
              },
            },
          },
        },
        {
          name: 'get-table-details',
          description:
            'Obtiene la definición completa de una tabla (columnas, índices, relaciones).',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description:
                  "Nombre de la tabla (por ejemplo, 'transactions'). Acepta nombre lógico o físico.",
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'list-table-relations',
          description:
            'Devuelve las relaciones (foreign keys) asociadas a una tabla específica.',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Nombre de la tabla a inspeccionar.',
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'get-schema-mermaid',
          description:
            'Genera un diagrama ER en formato Mermaid a partir del esquema actual.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search-endpoint': {
          const query = String(args?.query || '').trim();
          if (!query) {
            throw new Error("Debes proporcionar el parámetro 'query'.");
          }

          const spec = await apiClient.fetchOpenAPISpec();
          const results = searchEndpoints(spec, query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case 'get-endpoint-details': {
          const path = String(args?.path || '').trim();
          const method = String(args?.method || '').trim();
          if (!path || !method) {
            throw new Error("Debes proporcionar 'path' y 'method'.");
          }

          const spec = await apiClient.fetchOpenAPISpec();
          const endpoint = getEndpointDetails(spec, path, method);
          if (!endpoint) {
            throw new Error(`No se encontró el endpoint ${method} ${path}.`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(endpoint, null, 2),
              },
            ],
          };
        }

        case 'get-endpoint-code': {
          const path = String(args?.path || '').trim();
          const method = String(args?.method || '').trim();
          if (!path || !method) {
            throw new Error("Debes proporcionar 'path' y 'method'.");
          }

          const spec = await apiClient.fetchOpenAPISpec();
          const endpoint = getEndpointDetails(spec, path, method);
          if (!endpoint) {
            throw new Error(`No se encontró el endpoint ${method} ${path}.`);
          }

          const code = generateCodeExample(endpoint, apiClient.baseUrl);
          return {
            content: [
              {
                type: 'text',
                text: code,
              },
            ],
          };
        }

        case 'list-endpoints-by-tag': {
          const tag = String(args?.tag || '').trim();
          if (!tag) {
            throw new Error("Debes proporcionar 'tag'.");
          }

          const spec = await apiClient.fetchOpenAPISpec();
          const results = listEndpointsByTag(spec, tag);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case 'list-tables': {
          const search = args?.search as string | undefined;
          const schemaDoc = await apiClient.fetchDatabaseSchema();
          let tables = listTables(schemaDoc);
          if (search) {
            const query = search.toLowerCase();
            tables = tables.filter(
              (table) =>
                table.tableName.toLowerCase().includes(query) ||
                table.name.toLowerCase().includes(query),
            );
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tables, null, 2),
              },
            ],
          };
        }

        case 'get-table-details': {
          const tableName = String(args?.table || '').trim();
          if (!tableName) {
            throw new Error("Debes proporcionar el parámetro 'table'.");
          }

          const schemaDoc = await apiClient.fetchDatabaseSchema();
          const table = getTableDetails(schemaDoc, tableName);
          if (!table) {
            throw new Error(`No se encontró la tabla '${tableName}'.`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(table, null, 2),
              },
            ],
          };
        }

        case 'list-table-relations': {
          const tableName = String(args?.table || '').trim();
          if (!tableName) {
            throw new Error("Debes proporcionar el parámetro 'table'.");
          }

          const schemaDoc = await apiClient.fetchDatabaseSchema();
          const relations = listTableRelations(schemaDoc, tableName);
          if (!relations) {
            throw new Error(`No se encontró la tabla '${tableName}'.`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(relations, null, 2),
              },
            ],
          };
        }

        case 'get-schema-mermaid': {
          const schemaDoc = await apiClient.fetchDatabaseSchema();
          const mermaid = buildMermaidFromSchema(schemaDoc);
          return {
            content: [
              {
                type: 'text',
                text: '```mermaid\n' + mermaid + '\n```',
              },
            ],
          };
        }

        default:
          throw new Error(`Herramienta no soportada: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return mcpServer;
}

