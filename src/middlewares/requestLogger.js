import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const { method, originalUrl } = req;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request completed', {
      method,
      path: originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      e2e: req.e2eMetadata
    });
  });

  next();
}
