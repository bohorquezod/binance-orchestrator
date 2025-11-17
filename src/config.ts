import dotenv from 'dotenv';

dotenv.config();

export type TransportMode = 'stdio' | 'http';

export interface ApiConfig {
  baseUrl: string;
  openApiSpecUrl: string;
  dbSchemaUrl: string;
  timeout: number;
}

export interface HttpConfig {
  host: string;
  port: number;
  basePath: string;
  healthPath: string;
  normalizedBasePath: string;
  healthPathVariants: Set<string>;
  healthPathForLog: string;
  allowedMcpPaths: Set<string>;
}

export interface AppConfig {
  api: ApiConfig;
  transportMode: TransportMode;
  http: HttpConfig;
}

const DEFAULT_API_BASE = process.env.BINANCE_DB_API_URL || 'http://localhost:3000/api';

function buildDefaultOpenApiSpecUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/api-docs.json`;
  } catch {
    return `${baseUrl.replace(/\/$/, '')}/api-docs.json`;
  }
}

function buildDefaultDbSchemaUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/db/schema`;
  } catch {
    return `${baseUrl.replace(/\/$/, '')}/db/schema`;
  }
}

export function loadConfig(): AppConfig {
  const baseUrl = DEFAULT_API_BASE.replace(/\/$/, '');
  const api: ApiConfig = {
    baseUrl,
    openApiSpecUrl: process.env.OPENAPI_SPEC_URL || buildDefaultOpenApiSpecUrl(baseUrl),
    dbSchemaUrl: process.env.DB_SCHEMA_URL || buildDefaultDbSchemaUrl(baseUrl),
    timeout: Number(process.env.BINANCE_DB_API_TIMEOUT ?? 30_000),
  };

  const transportMode = (process.env.BINANCE_DB_API_TRANSPORT ?? 'http').toLowerCase() as TransportMode;

  const basePath = normalizeBasePath(process.env.BINANCE_DB_API_HTTP_PATH ?? '/');
  const healthPath = normalizePath(process.env.BINANCE_DB_API_HTTP_HEALTH_PATH ?? '/health');
  const basePathWithSlash = basePath === '/' ? '/' : `${basePath}/`;

  const healthPathVariants = new Set<string>();
  healthPathVariants.add(normalizeForComparison(healthPath));
  healthPathVariants.add(normalizeForComparison(combinePathSegments(basePath, healthPath)));
  healthPathVariants.add(normalizeForComparison('/health'));
  healthPathVariants.add(
    normalizeForComparison(`${basePathWithSlash}${healthPath.replace(/^\//, '')}`),
  );

  const allowedMcpPaths = new Set<string>();
  const normalizedBasePath = normalizeForComparison(basePath);
  const defaultWellKnownPath = normalizeForComparison('/.well-known/mcp');
  const basePathWellKnown = normalizeForComparison(
    combinePathSegments(basePathWithSlash, '/.well-known/mcp'),
  );

  allowedMcpPaths.add(normalizedBasePath);
  allowedMcpPaths.add(defaultWellKnownPath);
  allowedMcpPaths.add(basePathWellKnown);

  const http: HttpConfig = {
    host: process.env.BINANCE_DB_API_HTTP_HOST ?? '0.0.0.0',
    port: Number(process.env.BINANCE_DB_API_HTTP_PORT ?? process.env.PORT ?? 8080),
    basePath,
    healthPath,
    normalizedBasePath,
    healthPathVariants,
    healthPathForLog: combinePathSegments(basePath, healthPath),
    allowedMcpPaths,
  };

  return {
    api,
    transportMode,
    http,
  };
}

export function normalizePath(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`;
  }
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
}

export function normalizeBasePath(value: string): string {
  const normalized = normalizePath(value);
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

export function normalizeForComparison(value: string): string {
  if (!value) {
    return '/';
  }
  let normalized = value.startsWith('/') ? value : `/${value}`;
  while (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized || '/';
}

export function combinePathSegments(base: string, suffix: string): string {
  const normalizedBase = base === '/' ? '' : base.replace(/\/+$/, '');
  const normalizedSuffix = suffix === '/' ? '' : suffix.replace(/^\/+/, '');
  if (!normalizedBase && !normalizedSuffix) {
    return '/';
  }
  if (!normalizedBase) {
    return `/${normalizedSuffix}`;
  }
  if (!normalizedSuffix) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedSuffix}`;
}

