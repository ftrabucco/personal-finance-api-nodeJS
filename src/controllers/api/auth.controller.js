import authService from '../../services/auth.service.js';
import logger from '../../utils/logger.js';
import Joi from 'joi';

/**
 * 🔐 AUTHENTICATION CONTROLLER
 *
 * Este controller maneja todas las rutas relacionadas con autenticación:
 * - POST /api/auth/register - Registrar nuevo usuario
 * - POST /api/auth/login - Hacer login
 * - GET /api/auth/profile - Obtener perfil del usuario autenticado
 * - PUT /api/auth/profile - Actualizar perfil
 * - POST /api/auth/change-password - Cambiar contraseña
 * - POST /api/auth/logout - Cerrar sesión (placeholder por ahora)
 */

/**
 * 📋 Esquemas de validación con Joi
 *
 * ¿Por qué validamos?
 * - Evitar que lleguen datos malformados al servicio
 * - Dar errores claros al frontend
 * - Seguridad: evitar inyecciones y datos maliciosos
 */
const registerSchema = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede superar 100 caracteres',
      'any.required': 'El nombre es requerido'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido'
    }),

  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.pattern.base': 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es requerida'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
});

const updateProfileSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional()
});

class AuthController {
  /**
   * 📝 REGISTRO - Crear nuevo usuario
   * POST /api/auth/register
   *
   * Body: { nombre, email, password }
   * Response: { success, message, data: { user } }
   */
  async register(req, res) {
    try {
      // 1. Validar datos de entrada
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Datos de registro inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      // 2. Registrar usuario usando AuthService
      const user = await authService.register(value);

      // 3. Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: { user }
      });

    } catch (error) {
      logger.error('Error en registro', { error: error.message, body: req.body });

      // Error específico: email ya existe
      if (error.message === 'Email ya está registrado') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Error genérico
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 🔑 LOGIN - Autenticar usuario
   * POST /api/auth/login
   *
   * Body: { email, password }
   * Response: { success, message, data: { token, user } }
   */
  async login(req, res) {
    try {
      // 1. Validar datos
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Datos de login inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      // 2. Hacer login usando AuthService
      const { token, user } = await authService.login(value.email, value.password);

      // 3. Respuesta exitosa con token
      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user
        }
      });

    } catch (error) {
      logger.warn('Intento de login fallido', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });

      // Error específico: credenciales inválidas
      if (error.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Email o contraseña incorrectos',
          error: 'INVALID_CREDENTIALS'
        });
      }

      // Error genérico
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 👤 PERFIL - Obtener datos del usuario autenticado
   * GET /api/auth/profile
   *
   * Headers: Authorization: Bearer <token>
   * Response: { success, message, data: { user } }
   *
   * ⚠️ Este endpoint REQUIERE autenticación (middleware authenticateToken)
   */
  async getProfile(req, res) {
    try {
      // El usuario ya está en req.user gracias al middleware authenticateToken
      res.status(200).json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          user: req.user
        }
      });

    } catch (error) {
      logger.error('Error obteniendo perfil', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * ✏️ ACTUALIZAR PERFIL - Modificar datos del usuario
   * PUT /api/auth/profile
   *
   * Headers: Authorization: Bearer <token>
   * Body: { nombre?, email? }
   * Response: { success, message, data: { user } }
   */
  async updateProfile(req, res) {
    try {
      // 1. Validar datos
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      // 2. Si quiere cambiar email, verificar que no exista
      if (value.email && value.email !== req.user.email) {
        const existingUser = await authService.findByEmail(value.email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email ya está en uso',
            error: 'EMAIL_ALREADY_EXISTS'
          });
        }
      }

      // 3. Actualizar usando BaseService
      await authService.update(req.user.id, value);

      // 4. Obtener usuario actualizado
      const updatedUser = await authService.getUserById(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Error actualizando perfil', {
        error: error.message,
        userId: req.user?.id,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 🔄 CAMBIAR CONTRASEÑA
   * POST /api/auth/change-password
   *
   * Headers: Authorization: Bearer <token>
   * Body: { currentPassword, newPassword }
   * Response: { success, message }
   */
  async changePassword(req, res) {
    try {
      // 1. Validar datos
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      // 2. Cambiar contraseña usando AuthService
      await authService.changePassword(
        req.user.id,
        value.currentPassword,
        value.newPassword
      );

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error cambiando contraseña', {
        error: error.message,
        userId: req.user?.id
      });

      // Error específico: contraseña actual incorrecta
      if (error.status === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: 'INVALID_CURRENT_PASSWORD'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 🚪 LOGOUT - Cerrar sesión
   * POST /api/auth/logout
   *
   * Con JWTs, el logout es principalmente del lado del cliente
   * (eliminar el token del localStorage/cookies)
   *
   * Aquí podríamos implementar blacklist de tokens en el futuro
   */
  async logout(req, res) {
    try {
      logger.info('Usuario cerró sesión', { userId: req.user?.id });

      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      logger.error('Error en logout', { error: error.message });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

// Crear instancia y exportar métodos
const authController = new AuthController();

export const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} = authController;

export default authController;