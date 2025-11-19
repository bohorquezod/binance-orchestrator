// Import centralized environment variable configuration FIRST
// This ensures variables are loaded before any other module
import '@config/env.config';

import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, generateSwaggerSpec } from '@config/swagger.config';
import { errorHandler, notFoundHandler } from '@middleware/error.middleware';
import { logger } from '@utils/logger';

// Import controllers
import * as orchestratorController from '@controllers/orchestrator.controller';
import * as healthController from '@controllers/health.controller';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Global middlewares
// Configure Helmet with relaxed rules for Swagger UI routes
const defaultHelmet = helmet();
const swaggerHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false,
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api-docs')) {
    swaggerHelmet(req, res, next);
    return;
  }
  defaultHelmet(req, res, next);
});

app.use(cors()); // Enable CORS
app.use(express.json()); // JSON parser
app.use(express.urlencoded({ extended: true })); // URL-encoded parser

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', healthController.healthCheck);

// Swagger documentation
// In development, regenerate spec on each request to pick up changes
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const SWAGGER_UI_PATH = '/api-docs';
const SWAGGER_JSON_PATH = '/api-docs.json';

// Middleware to get prefix from request
const getPrefix = (req: Request): string => {
  // Try multiple sources for the prefix
  const xForwardedPrefix = req.headers['x-forwarded-prefix'] as string | undefined;
  const forwardedPrefix = req.headers['forwarded-prefix'] as string | undefined;
  
  // Fallback: use environment variable if headers are not present
  const envPrefix = process.env.TRAEFIK_PREFIX;
  
  const prefix = xForwardedPrefix || forwardedPrefix || envPrefix;
  return prefix ? prefix.replace(/\/$/, '') : '';
};

// Intercept redirects to prevent losing the prefix
const preventRedirects = (req: Request, res: Response, next: NextFunction) => {
  const prefix = getPrefix(req);
  
  if (prefix) {
    // Store original methods to ensure they're bound correctly
    const originalRedirect = res.redirect.bind(res);
    const originalSetHeader = res.setHeader.bind(res);
    const originalWriteHead = res.writeHead.bind(res);
    
    // Override redirect to always preserve prefix
    res.redirect = function(urlOrStatus: string | number, urlOrStatus2?: string | number) {
      let url: string;
      let status: number | undefined;
      
      // Determine which overload is being used
      if (typeof urlOrStatus === 'number') {
        // redirect(status, url)
        status = urlOrStatus;
        url = urlOrStatus2 as string;
      } else {
        // redirect(url) or redirect(url, status)
        url = urlOrStatus;
        status = urlOrStatus2 as number | undefined;
      }
      
      // Add prefix if needed
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith(prefix)) {
        url = `${prefix}${url}`;
      }
      
      // Call original with correct signature
      if (status !== undefined) {
        return originalRedirect(status, url);
      }
      return originalRedirect(url);
    } as typeof res.redirect;
    
    // Override location header in case swagger-ui sets it directly via setHeader
    res.setHeader = function(name: string, value: string | number | string[]) {
      // Only intercept Location header, let everything else pass through
      if (name.toLowerCase() === 'location' && typeof value === 'string') {
        // Only modify if it's a relative path that doesn't already have the prefix
        if (value.startsWith('/') && !value.startsWith(prefix)) {
          // Only add prefix for api-docs related paths
          if (value.startsWith('/api-docs') || value === '/') {
            value = `${prefix}${value}`;
          }
        }
      }
      return originalSetHeader.call(this, name, value);
    };
    
    // Override writeHead to intercept Location header set via writeHead
    res.writeHead = function(statusCode: number, ...args: any[]) {
      if (statusCode >= 300 && statusCode < 400) {
        // This is a redirect status code, check for Location header
        const headers = args.find(arg => typeof arg === 'object' && arg !== null && !Array.isArray(arg));
        if (headers && headers['location']) {
          const location = headers['location'] as string;
          if (location.startsWith('/') && !location.startsWith(prefix)) {
            headers['location'] = `${prefix}${location}`;
          }
        }
      }
      return originalWriteHead(statusCode, ...args);
    };
  }
  
  next();
};

// Helper function to serve Swagger UI with prefix support
const serveSwaggerUI = (req: Request, res: Response, next: NextFunction) => {
  const prefix = getPrefix(req);
  const swaggerUrl = prefix ? `${prefix}${SWAGGER_JSON_PATH}` : SWAGGER_JSON_PATH;
  
  // Modify the spec to include the prefix in server URLs
  // Clone the spec to avoid mutating the cached version
  const baseSpec = isDevelopment ? generateSwaggerSpec() : swaggerSpec;
  const spec = JSON.parse(JSON.stringify(baseSpec)) as any;
  
  if (prefix && spec.servers) {
    spec.servers = [
      {
        url: prefix,
        description: `Server with prefix ${prefix}`,
      },
      ...spec.servers,
    ];
  }
  
  const originalSend = res.send.bind(res);
  res.send = function(body: any) {
    if (typeof body === 'string' && prefix && body.includes('<!DOCTYPE html>')) {
      let modifiedBody = body;
      
      // Replace relative paths in link tags (CSS, favicons, etc.)
      modifiedBody = modifiedBody.replace(/<link([^>]*)\s+href="\.\/([^"]+)"/g, 
        `<link$1 href="${prefix}/api-docs/$2"`);
      modifiedBody = modifiedBody.replace(/<link([^>]*)\s+href="([^"]+)"([^>]*)\s+rel="stylesheet"/g, 
        (match, before, href, after) => {
          if (href.startsWith('./') || (href.startsWith('/') && !href.startsWith(prefix))) {
            const newHref = href.startsWith('./') 
              ? `${prefix}/api-docs/${href.substring(2)}`
              : href.startsWith('/api-docs') 
                ? `${prefix}${href}`
                : href;
            return `<link${before} href="${newHref}"${after} rel="stylesheet"`;
          }
          return match;
        });
      
      // Replace relative paths in script tags
      modifiedBody = modifiedBody.replace(/<script([^>]*)\s+src="\.\/([^"]+)"/g, 
        `<script$1 src="${prefix}/api-docs/$2"`);
      modifiedBody = modifiedBody.replace(/<script([^>]*)\s+src="([^"]+)"([^>]*)>/g, 
        (match, before, src, after) => {
          if (src.startsWith('./') || (src.startsWith('/') && !src.startsWith(prefix) && src.startsWith('/api-docs'))) {
            const newSrc = src.startsWith('./') 
              ? `${prefix}/api-docs/${src.substring(2)}`
              : src.startsWith('/api-docs') 
                ? `${prefix}${src}`
                : src;
            return `<script${before} src="${newSrc}"${after}>`;
          }
          return match;
        });
      
      // Replace relative paths in img tags (favicons)
      modifiedBody = modifiedBody.replace(/<link([^>]*)\s+href="([^"]+)"([^>]*)\s+rel="icon"/g, 
        (match, before, href, after) => {
          if (href.startsWith('./') || (href.startsWith('/') && !href.startsWith(prefix))) {
            const newHref = href.startsWith('./') 
              ? `${prefix}/api-docs/${href.substring(2)}`
              : href.startsWith('/api-docs') 
                ? `${prefix}${href}`
                : href;
            return `<link${before} href="${newHref}"${after} rel="icon"`;
          }
          return match;
        });
      
      // Inject JavaScript to prevent client-side redirects that lose the prefix
      const redirectPreventionScript = `
<script>
(function() {
  const prefix = '${prefix}';
  
  // Simple monitor that corrects navigation if prefix is lost
  function checkAndFixPath() {
    const pathname = window.location.pathname;
    if ((pathname === '/api-docs' || pathname === '/api-docs/') && !pathname.startsWith(prefix)) {
      window.location.replace(prefix + pathname + window.location.search + window.location.hash);
      return;
    }
  }
  
  // Check on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndFixPath);
  } else {
    checkAndFixPath();
  }
  
  // Check periodically (less aggressive than before)
  setInterval(checkAndFixPath, 500);
})();
</script>`;
      
      // Inject the redirect prevention script before the closing </head> tag
      modifiedBody = modifiedBody.replace(/<\/head>/i, `${redirectPreventionScript}</head>`);
      
      return originalSend(modifiedBody);
    }
    return originalSend(body);
  } as typeof res.send;

  const setupMiddleware = swaggerUi.setup as (
    doc: typeof swaggerSpec,
    opts?: { customCss?: string; customSiteTitle?: string; swaggerUrl?: string }
  ) => RequestHandler;

  const handler: RequestHandler = setupMiddleware(spec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Binance Orchestrator API - Documentation',
    swaggerUrl: swaggerUrl,
  });
  handler(req, res, next);
};

// Apply redirect prevention to ALL Swagger routes FIRST
app.use(SWAGGER_UI_PATH, preventRedirects);

// Handle main page WITHOUT trailing slash - serve content directly (NO redirect)
app.get(SWAGGER_UI_PATH, serveSwaggerUI);

// Handle main page WITH trailing slash
app.get(`${SWAGGER_UI_PATH}/`, serveSwaggerUI);

// Serve static assets (CSS, JS, etc.) - MUST come after app.get routes
app.use(`${SWAGGER_UI_PATH}/`, swaggerUi.serve);

// OpenAPI JSON spec endpoint
app.get(SWAGGER_JSON_PATH, (_req: Request, res: Response) => {
  const spec = isDevelopment ? generateSwaggerSpec() : swaggerSpec;
  res.setHeader('Content-Type', 'application/json');
  res.send(spec);
});

// API Routes

// Orchestrator endpoints
app.post(
  '/api/v1/orchestrator/process-csv',
  orchestratorController.validateProcessCsv,
  orchestratorController.processCsv
);

app.get(
  '/api/v1/orchestrator/sync-data',
  orchestratorController.validateSyncData,
  orchestratorController.syncData
);

app.post(
  '/api/v1/orchestrator/bridge-webhook',
  orchestratorController.bridgeWebhook
);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    logger.info(`📋 OpenAPI spec available at http://localhost:${PORT}/api-docs.json`);
  });
}

export default app;

