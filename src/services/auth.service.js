import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BaseService } from './base.service.js';
import { Usuario } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * 🔐 AuthService - Maneja toda la lógica de autenticación
 *
 * ¿Qué hace este servicio?
 * 1. Registrar nuevos usuarios (hasheando passwords)
 * 2. Hacer login (verificando passwords)
 * 3. Generar tokens JWT
 * 4. Verificar tokens JWT
 * 5. Gestionar refresh tokens
 *
 * Extiende BaseService para tener todos los métodos CRUD básicos
 */
export class AuthService extends BaseService {
  constructor() {
    // Le pasamos el modelo Usuario al BaseService
    super(Usuario);

    // Configuración para JWT
    this.JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'; // En producción DEBE estar en .env
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // Token expira en 7 días
    this.BCRYPT_ROUNDS = 10; // Nivel de seguridad para bcrypt

    // Validar JWT_SECRET en producción
    this._validateJWTSecret();
  }

  /**
   * Valida que JWT_SECRET sea seguro en producción
   * @private
   */
  _validateJWTSecret() {
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultSecrets = [
      'tu_secret_key_aqui',
      'your_jwt_secret_here',
      'your_jwt_secret_here_change_in_production'
    ];

    if (isProduction) {
      // Verificar que existe
      if (!this.JWT_SECRET) {
        const error = new Error('JWT_SECRET is required in production environment');
        logger.error('Security Error: Missing JWT_SECRET in production', { env: process.env.NODE_ENV });
        throw error;
      }

      // Verificar que no sea un valor por defecto
      if (defaultSecrets.includes(this.JWT_SECRET)) {
        const error = new Error('JWT_SECRET must be changed from default value in production');
        logger.error('Security Error: Using default JWT_SECRET in production', {
          env: process.env.NODE_ENV,
          secretLength: this.JWT_SECRET.length
        });
        throw error;
      }

      // Verificar longitud mínima (al menos 32 caracteres para seguridad)
      if (this.JWT_SECRET.length < 32) {
        logger.warn('Security Warning: JWT_SECRET should be at least 32 characters long', {
          length: this.JWT_SECRET.length
        });
      }
    }
  }

  /**
   * 📝 REGISTRO - Crear nuevo usuario con password hasheado
   *
   * ¿Por qué hasheamos el password?
   * - Si alguien hackea la DB, no puede ver los passwords reales
   * - bcrypt añade "salt" para que cada hash sea único
   */
  async register(userData) {
    try {
      const { nombre, email, password } = userData;

      // 1. Verificar si el email ya existe
      const existingUser = await this.model.findOne({ where: { email } });
      if (existingUser) {
        const error = new Error('Email ya está registrado');
        error.status = 400;
        throw error;
      }

      // 2. Hashear el password ANTES de guardar en DB
      const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

      // 3. Crear usuario con password hasheado
      const user = await this.create({
        nombre,
        email,
        password: hashedPassword // ⚠️ Nunca guardamos el password original
      });

      // 4. No devolver el password en la respuesta
      const { password: _, ...userWithoutPassword } = user.dataValues;

      logger.info('Usuario registrado exitosamente', { userId: user.id, email });

      return userWithoutPassword;
    } catch (error) {
      logger.error('Error en registro de usuario', { error: error.message, userData: { email: userData.email } });
      throw error;
    }
  }

  /**
   * 🔑 LOGIN - Verificar credenciales y generar JWT token
   *
   * Flow del login:
   * 1. Buscar usuario por email
   * 2. Comparar password con hash de la DB
   * 3. Si es correcto, generar token JWT
   * 4. Devolver token y datos del usuario
   */
  async login(email, password) {
    try {
      // 1. Buscar usuario por email
      const user = await this.model.findOne({ where: { email } });
      if (!user) {
        const error = new Error('Credenciales inválidas');
        error.status = 401; // Unauthorized
        throw error;
      }

      // 2. Verificar password con bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        throw error;
      }

      // 3. Generar JWT token
      const token = this.generateToken(user);

      // 4. Preparar respuesta SIN password
      const { password: _, ...userWithoutPassword } = user.dataValues;

      logger.info('Login exitoso', { userId: user.id, email });

      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      logger.error('Error en login', { error: error.message, email });
      throw error;
    }
  }

  /**
   * 🎫 Generar JWT Token
   *
   * ¿Qué es un JWT?
   * - Es como un "ticket" que identifica al usuario
   * - Contiene info del usuario encriptada
   * - El frontend lo envía en cada request para identificarse
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'finanzas-api' // Quién emite el token
    });
  }

  /**
   * ✅ Verificar JWT Token
   *
   * Esto lo usará el middleware para validar tokens en cada request
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.warn('Token inválido o expirado', { error: error.message });
      const authError = new Error('Token inválido');
      authError.status = 401;
      throw authError;
    }
  }

  /**
   * 👤 Obtener usuario por ID (usado por middleware)
   */
  async getUserById(id) {
    try {
      const user = await this.findById(id); // Método heredado de BaseService
      if (!user) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      // No devolver password
      const { password: _, ...userWithoutPassword } = user.dataValues;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error obteniendo usuario por ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * 📧 Obtener usuario por email
   */
  async findByEmail(email) {
    try {
      const user = await this.model.findOne({ where: { email } });
      return user;
    } catch (error) {
      logger.error('Error obteniendo usuario por email', { error: error.message, email });
      throw error;
    }
  }

  /**
   * 🔄 Cambiar password (funcionalidad extra)
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // 1. Obtener usuario
      const user = await this.findById(userId);
      if (!user) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      // 2. Verificar password actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        const error = new Error('Password actual incorrecto');
        error.status = 400;
        throw error;
      }

      // 3. Hashear nuevo password
      const hashedNewPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

      // 4. Actualizar en DB
      await this.update(userId, { password: hashedNewPassword });

      logger.info('Password cambiado exitosamente', { userId });

      return { message: 'Password actualizado correctamente' };
    } catch (error) {
      logger.error('Error cambiando password', { error: error.message, userId });
      throw error;
    }
  }
}

// Crear instancia singleton para usar en toda la app
const authService = new AuthService();
export default authService;
