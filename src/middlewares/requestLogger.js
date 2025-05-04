import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const { method, originalUrl } = req;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${method} ${originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}
