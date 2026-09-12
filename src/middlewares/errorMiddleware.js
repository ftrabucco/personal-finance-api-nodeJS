import logger from '../utils/logger.js';

export function errorMiddleware(err, req, res, _next) {
  const statusCode = err.status || 500;
  const message = err.message || 'Error Interno del Servidor';
  const detalles = err.details || [];

  logger.error('Request error captured', {
    message,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    stack: err.stack,
    ...(req.e2eMetadata ? { e2e: req.e2eMetadata } : {})
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    detalles
  });
}
