import authService from '../services/auth.service.js';
import logger from '../utils/logger.js';

/**
 * 🛡️ MIDDLEWARE DE AUTENTICACIÓN
 *
 * ¿Qué es un middleware?
 * - Es una función que se ejecuta ANTES de llegar al controller
 * - Puede bloquear el request si no está autorizado
 * - Añade información al `req` object para que la use el controller
 *
 * Flow:
 * Request → auth middleware → controller
 *         (verifica token)   (usa req.user)
 */

/**
 * 🔐 Middleware principal de autenticación
 *
 * ¿Cómo funciona?
 * 1. Busca el token en el header "Authorization"
 * 2. Verifica que el token sea válido
 * 3. Obtiene los datos del usuario
 * 4. Los añade a req.user para que lo use el controller
 * 5. Si algo falla, bloquea el request con error 401
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // 1. Obtener token del header Authorization
    // Formato esperado: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
    }

    // 2. Extraer token (remover "Bearer ")
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7) // Remover "Bearer " (7 caracteres)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    // 3. Verificar token con AuthService
    const decoded = authService.verifyToken(token);

    // 4. Obtener datos completos del usuario
    const user = await authService.getUserById(decoded.id);

    // 5. Añadir usuario a req para que lo usen los controllers
    req.user = user;

    // 6. Continuar al siguiente middleware/controller
    next();

  } catch (error) {
    logger.warn('Intento de acceso con token inválido', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.originalUrl}`
    });

    // Token inválido o expirado
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: 'INVALID_TOKEN'
    });
  }
};

/**
 * 🔓 Middleware opcional de autenticación
 *
 * A veces queremos obtener el usuario SI está logueado,
 * pero no bloquear si no lo está.
 *
 * Ejemplo: Un endpoint público que muestra info extra si estás logueado
 */
export const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No hay token, pero está ok - continuar sin usuario
      req.user = null;
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      req.user = null;
      return next();
    }

    // Intentar verificar token
    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.id);
    req.user = user;

    next();

  } catch (error) {
    // Si hay error con el token, simplemente no asignar usuario
    // No bloquear el request
    req.user = null;
    next();
  }
};

/**
 * 🛡️ Middleware para verificar roles (funcionalidad futura)
 *
 * Esto sería para cuando implementemos roles como admin, user, etc.
 */
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado',
        error: 'NO_USER'
      });
    }

    // En el futuro, cuando tengamos roles en el modelo Usuario
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * 📝 Middleware para logging de requests autenticados
 *
 * Log información útil sobre quién hace qué
 */
export const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    logger.info('Request autenticado', {
      userId: req.user.id,
      email: req.user.email,
      endpoint: `${req.method} ${req.originalUrl}`,
      ip: req.ip
    });
  }
  next();
};

// Export default para el middleware principal
export default authenticateToken;
