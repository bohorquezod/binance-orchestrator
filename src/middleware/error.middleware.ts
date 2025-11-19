import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';

/**
 * Middleware for centralized error handling
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error handling request', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // If a response was already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine status code and message
  let statusCode = 500;
  let message = 'Internal server error';

  if (err.message.includes('Validation error')) {
    statusCode = 400;
    message = err.message;
  } else if (
    err.message.includes('Unauthorized') || 
    err.message.includes('API key') || 
    err.message.includes('Invalid API-key') ||
    err.message.includes('permissions')
  ) {
    statusCode = 401;
    message = err.message;
  } else if (err.message.includes('Forbidden')) {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.message.includes('Not found')) {
    statusCode = 404;
    message = 'Not found';
  } else if (err.message) {
    message = err.message;
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Middleware to handle routes not found
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
}

