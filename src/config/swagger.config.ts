import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
// Import centralized environment variable configuration
import '@config/env.config';

const getSwaggerOptions = (): swaggerJsdoc.Options => ({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Binance Orchestrator API',
      version: '1.0.0',
      description: 'Orchestrator service for coordinating multiple Binance-related microservices. Handles CSV processing, data synchronization, and webhook coordination.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'number',
              description: 'Error code',
            },
          },
        },
        ProcessCsvRequest: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: {
              type: 'string',
              description: 'ID of the CSV file to process',
              example: 'file-123',
            },
          },
        },
        ProcessCsvResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            recordsProcessed: {
              type: 'number',
            },
          },
        },
        SyncDataResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            recordsUpdated: {
              type: 'number',
            },
            recordsCreated: {
              type: 'number',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Orchestrator',
        description: 'Endpoints for orchestrating operations across multiple services',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  // Use absolute paths to ensure swagger-jsdoc finds the files
  apis: [
    path.join(__dirname, '../controllers/**/*.ts'),
    path.join(__dirname, '../**/*.ts'),
    './src/**/*.ts', // Fallback for development mode
  ],
});

/**
 * Generate Swagger spec dynamically
 * In development, regenerates on each request to pick up changes
 * In production, caches the result for performance
 */
export const generateSwaggerSpec = (): ReturnType<typeof swaggerJsdoc> => {
  return swaggerJsdoc(getSwaggerOptions());
};

// Cache the spec in production, regenerate in development
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
let cachedSpec: ReturnType<typeof swaggerJsdoc> | null = null;

export const swaggerSpec = isDevelopment 
  ? generateSwaggerSpec() // Regenerate in development
  : (cachedSpec ||= generateSwaggerSpec()); // Cache in production

// Export function to regenerate spec (useful for development)
export const regenerateSwaggerSpec = (): ReturnType<typeof swaggerJsdoc> => {
  cachedSpec = null;
  return generateSwaggerSpec();
};

