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

/**
 * 🛣️ RUTAS DE AUTENTICACIÓN
 *
 * Este archivo define todas las rutas relacionadas con autenticación
 * y qué middlewares usar en cada una.
 *
 * Rutas públicas (sin autenticación):
 * - POST /api/auth/register
 * - POST /api/auth/login
 *
 * Rutas protegidas (requieren autenticación):
 * - GET /api/auth/profile
 * - PUT /api/auth/profile
 * - POST /api/auth/change-password
 * - POST /api/auth/logout
 */

const router = express.Router();

// 📋 RUTAS PÚBLICAS (no requieren autenticación)

/**
 * 📝 REGISTRO
 * POST /api/auth/register
 * Body: { nombre, email, password }
 */
router.post('/register', register);

/**
 * 🔑 LOGIN
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, user }
 */
router.post('/login', login);

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