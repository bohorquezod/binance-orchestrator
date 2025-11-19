import type { ApiConfig } from './config.js';

export interface OpenAPISpec {
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
  };
  tags?: Array<{ name: string; description?: string }>;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
}

export interface ColumnDoc {
  name: string;
  type: string;
  databaseType: string;
  isNullable: boolean;
  isPrimary: boolean;
  isUnique: boolean;
  default?: string | null;
  length?: string | null;
  precision?: number | null;
  scale?: number | null;
  enumValues?: string[] | null;
  comment?: string | null;
}

export interface RelationDoc {
  propertyName: string;
  type: string;
  targetTable: string;
  targetEntity: string;
  joinColumns: string[];
  inverseSideProperty?: string | null;
}

export interface IndexDoc {
  name: string;
  columnNames: string[];
  isUnique: boolean;
  isSpatial: boolean;
  isFulltext: boolean;
}

export interface TableDoc {
  name: string;
  tableName: string;
  schema?: string | null;
  comment?: string | null;
  columns: ColumnDoc[];
  relations: RelationDoc[];
  indices: IndexDoc[];
}

export interface DatabaseSchemaDoc {
  database?: string | null;
  schema?: string | null;
  tables: TableDoc[];
  generatedAt: string;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const SCHEMA_CACHE_TTL = 60 * 1000; // 1 minuto

export class ApiClient {
  private cachedSpec: OpenAPISpec | null = null;
  private cacheTimestamp = 0;
  private cachedSchemaDoc: DatabaseSchemaDoc | null = null;
  private schemaCacheTimestamp = 0;

  constructor(private readonly config: ApiConfig) {}

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async fetchOpenAPISpec(): Promise<OpenAPISpec> {
    const now = Date.now();

    if (this.cachedSpec && now - this.cacheTimestamp < CACHE_TTL) {
      return this.cachedSpec;
    }

    try {
      const url = this.config.openApiSpecUrl;
      console.error(`[MCP] Fetching OpenAPI spec from: ${url}`);
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        console.error(`[MCP] Failed to fetch OpenAPI spec: ${response.status} ${response.statusText} from ${url}`);
        throw new Error(
          `No se pudo obtener el OpenAPI spec: ${response.status} ${response.statusText} (URL: ${url})`,
        );
      }

      this.cachedSpec = (await response.json()) as OpenAPISpec;
      this.cacheTimestamp = now;
      console.error(`[MCP] Successfully fetched OpenAPI spec from: ${url} (${Object.keys(this.cachedSpec.paths || {}).length} paths)`);
      return this.cachedSpec;
    } catch (error) {
      const url = this.config.openApiSpecUrl;
      console.error(`[MCP] Error fetching OpenAPI spec from ${url}:`, error);
      if (this.cachedSpec) {
        console.error(
          'Fallo al refrescar el OpenAPI spec. Se utiliza la versión en caché.',
          error,
        );
        return this.cachedSpec;
      }
      throw error;
    }
  }

  async fetchDatabaseSchema(): Promise<DatabaseSchemaDoc> {
    const now = Date.now();

    if (this.cachedSchemaDoc && now - this.schemaCacheTimestamp < SCHEMA_CACHE_TTL) {
      return this.cachedSchemaDoc;
    }

    try {
      const url = this.config.dbSchemaUrl;
      console.error(`[MCP] Fetching database schema from: ${url}`);
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        console.error(`[MCP] Failed to fetch schema: ${response.status} ${response.statusText} from ${url}`);
        throw new Error(
          `No se pudo obtener el esquema de base de datos: ${response.status} ${response.statusText} (URL: ${url})`,
        );
      }

      this.cachedSchemaDoc = (await response.json()) as DatabaseSchemaDoc;
      this.schemaCacheTimestamp = now;
      console.error(`[MCP] Successfully fetched database schema from: ${url}`);
      return this.cachedSchemaDoc;
    } catch (error) {
      const url = this.config.dbSchemaUrl;
      console.error(`[MCP] Error fetching database schema from ${url}:`, error);
      if (this.cachedSchemaDoc) {
        console.error(
          'Fallo al refrescar el esquema de base de datos. Se utiliza la versión en caché.',
          error,
        );
        return this.cachedSchemaDoc;
      }
      throw error;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

