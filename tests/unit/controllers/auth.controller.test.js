import { jest } from '@jest/globals';

/**
 * Unit Tests for AuthController
 * Tests controller logic, validation, and error handling
 */

// Mock dependencies
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getUserById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  changePassword: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock modules before importing controller
jest.unstable_mockModule('../../../src/services/auth.service.js', () => ({
  default: mockAuthService,
  AuthService: class {
    constructor() {
      return mockAuthService;
    }
  }
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller after mocking
const { default: authController } = await import('../../../src/controllers/api/auth.controller.js');

describe('AuthController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      user: null,
      ip: '127.0.0.1'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('register', () => {
    it('should register user successfully with valid data', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      };

      const registeredUser = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com'
      };

      mockReq.body = userData;
      mockAuthService.register.mockResolvedValueOnce(registeredUser);

      await authController.register(mockReq, mockRes);

      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: { user: registeredUser }
      });
    });

    it('should return validation error for missing nombre', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Datos de registro inválidos',
          errors: expect.arrayContaining([
            expect.stringContaining('nombre')
          ])
        })
      );
    });

    it('should return validation error for invalid email', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'invalid-email',
        password: 'Password123'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.stringContaining('email válido')
          ])
        })
      );
    });

    it('should return validation error for weak password', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.stringMatching(/contraseña|mayúscula|minúscula|número/)
          ])
        })
      );
    });

    it('should return error when email already exists', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'existing@example.com',
        password: 'Password123'
      };

      mockAuthService.register.mockRejectedValueOnce(
        new Error('Email ya está registrado')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email ya está registrado',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockReq.body = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      };

      mockAuthService.register.mockRejectedValueOnce(
        new Error('Database error')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const loginResult = {
        token: 'jwt.token.here',
        user: {
          id: 1,
          nombre: 'Test User',
          email: 'test@example.com'
        }
      };

      mockAuthService.login.mockResolvedValueOnce(loginResult);

      await authController.login(mockReq, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'Password123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login exitoso',
        data: loginResult
      });
    });

    it('should return validation error for missing email', async () => {
      mockReq.body = {
        password: 'Password123'
      };

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Datos de login inválidos'
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const error = new Error('Credenciales inválidas');
      error.status = 401;
      mockAuthService.login.mockRejectedValueOnce(error);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email o contraseña incorrectos',
        error: 'INVALID_CREDENTIALS'
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log failed login attempts with IP', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };
      mockReq.ip = '192.168.1.1';

      const error = new Error('Credenciales inválidas');
      error.status = 401;
      mockAuthService.login.mockRejectedValueOnce(error);

      await authController.login(mockReq, mockRes);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Intento de login fallido',
        expect.objectContaining({
          email: 'test@example.com',
          ip: '192.168.1.1'
        })
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockReq.user = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com'
      };

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          user: mockReq.user
        }
      });
    });

    it('should handle errors gracefully', async () => {
      mockReq.user = undefined; // No user set

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com'
      };
    });

    it('should update user profile successfully', async () => {
      mockReq.body = {
        nombre: 'Updated Name'
      };

      const updatedUser = {
        id: 1,
        nombre: 'Updated Name',
        email: 'test@example.com'
      };

      mockAuthService.update.mockResolvedValueOnce([1]);
      mockAuthService.getUserById.mockResolvedValueOnce(updatedUser);

      await authController.updateProfile(mockReq, mockRes);

      expect(mockAuthService.update).toHaveBeenCalledWith(1, { nombre: 'Updated Name' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: { user: updatedUser }
      });
    });

    it('should return validation error for invalid data', async () => {
      mockReq.body = {
        nombre: 'A' // Too short
      };

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Datos inválidos'
        })
      );
    });

    it('should reject email change to existing email', async () => {
      mockReq.body = {
        email: 'existing@example.com'
      };

      mockAuthService.findByEmail.mockResolvedValueOnce({
        id: 2,
        email: 'existing@example.com'
      });

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email ya está en uso',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    });

    it('should allow email change to own email', async () => {
      mockReq.body = {
        email: 'test@example.com' // Same as current email
      };

      const updatedUser = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com'
      };

      mockAuthService.findByEmail.mockResolvedValueOnce(null);
      mockAuthService.update.mockResolvedValueOnce([1]);
      mockAuthService.getUserById.mockResolvedValueOnce(updatedUser);

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com'
      };
    });

    it('should change password successfully', async () => {
      mockReq.body = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456'
      };

      mockAuthService.changePassword.mockResolvedValueOnce({
        message: 'Password actualizado correctamente'
      });

      await authController.changePassword(mockReq, mockRes);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        1,
        'OldPassword123',
        'NewPassword456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    });

    it('should return validation error for weak new password', async () => {
      mockReq.body = {
        currentPassword: 'OldPassword123',
        newPassword: 'weak'
      };

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Datos inválidos'
        })
      );
    });

    it('should return error for incorrect current password', async () => {
      mockReq.body = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456'
      };

      const error = new Error('Password actual incorrecto');
      error.status = 400;
      mockAuthService.changePassword.mockRejectedValueOnce(error);

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password actual incorrecto',
        error: 'INVALID_CURRENT_PASSWORD'
      });
    });

    it('should return validation error for missing fields', async () => {
      mockReq.body = {
        currentPassword: 'OldPassword123'
        // newPassword missing
      };

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com'
      };

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Usuario cerró sesión',
        { userId: 1 }
      );
    });

    it('should handle errors during logout', async () => {
      mockReq.user = undefined; // No user set

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
