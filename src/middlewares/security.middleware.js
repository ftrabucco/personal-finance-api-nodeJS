import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

// Configurar CORS
export const corsMiddleware = cors({
  origin: config.security.cors.origin,
  credentials: config.security.cors.credentials,
  optionsSuccessStatus: 200
});

// Configurar Helmet para security headers
export const helmetMiddleware = helmet(config.security.helmet);

// Configurar Rate Limiting (deshabilitado en tests)
export const rateLimitMiddleware = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      message: {
        error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit excedido', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });

        res.status(429).json({
          success: false,
          error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
          retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
        });
      }
    });

// Rate limiting más estricto para endpoints de autenticación (deshabilitado en tests y desarrollo)
export const authRateLimitMiddleware = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // 5 intentos por ventana
      message: {
        error: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.'
      },
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        logger.warn('Rate limit de autenticación excedido', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });

        res.status(429).json({
          success: false,
          error: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.'
        });
      }
    });

// Middleware para sanitizar inputs
export const sanitizeMiddleware = (req, res, next) => {
  // Remover campos potencialmente peligrosos
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      dangerousFields.forEach(field => {
        delete obj[field];
      });

      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          // Remover scripts potencialmente maliciosos
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
      });
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
};

// Middleware para logging de seguridad
export const securityLoggerMiddleware = (req, res, next) => {
  // Log de peticiones sospechosas
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS
    /union.*select/i, // SQL injection
    /javascript:/i, // XSS
    /data:text\/html/i // Data URI XSS
  ];

  const fullUrl = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(fullUrl) ||
    pattern.test(userAgent) ||
    pattern.test(referer) ||
    pattern.test(JSON.stringify(req.body))
  );

  if (isSuspicious) {
    logger.warn('Petición sospechosa detectada', {
      ip: req.ip,
      method: req.method,
      url: fullUrl,
      userAgent,
      referer,
      body: req.body
    });
  }

  next();
};

// Middleware para validar Content-Type en POST/PUT
export const validateContentTypeMiddleware = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');

    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type header requerido'
      });
    }

    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];

    const isValidType = allowedTypes.some(type => contentType.includes(type));

    if (!isValidType) {
      return res.status(415).json({
        success: false,
        error: 'Content-Type no soportado'
      });
    }
  }

  next();
};

// Exportar todos los middlewares como un conjunto
export const securityMiddlewares = [
  corsMiddleware,
  helmetMiddleware,
  rateLimitMiddleware,
  sanitizeMiddleware,
  securityLoggerMiddleware,
  validateContentTypeMiddleware
];

export default {
  cors: corsMiddleware,
  helmet: helmetMiddleware,
  rateLimit: rateLimitMiddleware,
  authRateLimit: authRateLimitMiddleware,
  sanitize: sanitizeMiddleware,
  securityLogger: securityLoggerMiddleware,
  validateContentType: validateContentTypeMiddleware,
  all: securityMiddlewares
};
