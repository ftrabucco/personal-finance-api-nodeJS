/**
 * 🏗️ Container Middleware
 *
 * Crea un scope del container DI para cada request HTTP.
 * Esto permite que los servicios scoped tengan una instancia única por request.
 *
 * Uso en rutas:
 * ```javascript
 * router.post('/gastos', (req, res) => {
 *   const gastoService = req.container.resolve('gastoUnicoService');
 *   // ...
 * });
 * ```
 */

import { createScope } from '../container/index.js';

/**
 * Middleware que crea un scope del container para cada request
 */
export function containerMiddleware(req, res, next) {
  // Crear scope para este request
  req.scope = createScope();

  // Helper para resolver dependencias fácilmente
  req.container = {
    resolve: (name) => req.scope.resolve(name),
    cradle: req.scope.cradle
  };

  // Limpiar el scope cuando termine el request
  res.on('finish', () => {
    if (req.scope && typeof req.scope.dispose === 'function') {
      req.scope.dispose();
    }
  });

  next();
}

/**
 * Helper para usar en controllers - obtiene un servicio del container
 *
 * @param {Request} req - Express request object
 * @param {string} serviceName - Nombre del servicio a resolver
 * @returns {Object} La instancia del servicio
 */
export function getService(req, serviceName) {
  if (!req.container) {
    throw new Error('Container middleware not applied. Add containerMiddleware to your route.');
  }
  return req.container.resolve(serviceName);
}

export default containerMiddleware;
