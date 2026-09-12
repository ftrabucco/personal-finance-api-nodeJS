import logger from '../utils/logger.js';

export function errorMiddleware(err, req, res, _next) {
  //logger.error(`${err.message}`, { stack: err.stack });
  logger.error(`${err.message}`, { e2e: req.e2eMetadata });
  logger.error('Error capturado:', {
    error: err,
    e2e: req.e2eMetadata
  });

  const statusCode = err.status || 500;
  const message = err.message || 'Error Interno del Servidor';
  const detalles = err.details || [];

  res.status(statusCode).json({
    status: 'error',
    message,
    detalles
  });
}
