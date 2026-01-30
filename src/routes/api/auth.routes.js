import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} from '../../controllers/api/auth.controller.js';
import { authenticateToken, logAuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import securityMiddleware from '../../middlewares/security.middleware.js';

/**
 * 🛣️ RUTAS DE AUTENTICACIÓN
 *
 * Este archivo define todas las rutas relacionadas con autenticación
 * y qué middlewares usar en cada una.
 *
 * Rutas públicas (sin autenticación):
 * - POST /api/auth/register (con rate limiting estricto)
 * - POST /api/auth/login (con rate limiting estricto)
 *
 * Rutas protegidas (requieren autenticación):
 * - GET /api/auth/profile
 * - PUT /api/auth/profile
 * - POST /api/auth/change-password
 * - POST /api/auth/logout
 *
 * Seguridad:
 * - Rate limiting estricto en login/register (5 intentos cada 15 min)
 * - Rate limiting normal en otras rutas (100 intentos cada 15 min)
 */

const router = express.Router();

// 📋 RUTAS PÚBLICAS (no requieren autenticación)
// ⚠️ Con rate limiting ESTRICTO para prevenir ataques de fuerza bruta

/**
 * 📝 REGISTRO
 * POST /api/auth/register
 * Body: { nombre, email, password }
 * Rate limit: 5 intentos cada 15 minutos
 */
router.post('/register', securityMiddleware.authRateLimit, register);

/**
 * 🔑 LOGIN
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, user }
 * Rate limit: 5 intentos cada 15 minutos
 */
router.post('/login', securityMiddleware.authRateLimit, login);

// 🛡️ RUTAS PROTEGIDAS (requieren JWT token válido)
// A partir de aquí, todas las rutas usan authenticateToken middleware

/**
 * 👤 OBTENER PERFIL
 * GET /api/auth/profile
 * Headers: Authorization: Bearer <token>
 */
router.get('/profile',
  authenticateToken,        // ← Verificar token JWT
  logAuthenticatedRequest,  // ← Log para auditoría
  getProfile
);

/**
 * ✏️ ACTUALIZAR PERFIL
 * PUT /api/auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { nombre?, email? }
 */
router.put('/profile',
  authenticateToken,
  logAuthenticatedRequest,
  updateProfile
);

/**
 * 🔄 CAMBIAR CONTRASEÑA
 * POST /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password',
  authenticateToken,
  logAuthenticatedRequest,
  changePassword
);

/**
 * 🚪 LOGOUT
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout',
  authenticateToken,
  logAuthenticatedRequest,
  logout
);

export default router;
