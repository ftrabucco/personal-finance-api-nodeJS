import request from 'supertest';
import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';

/**
 * Integration Tests for Authentication Flow
 * Tests complete auth flows including register → login → access protected routes
 */

// Mock environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing';
process.env.JWT_EXPIRES_IN = '7d';

// Mock database and models
const mockUsuario = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
};

// Mock modules before importing app
jest.unstable_mockModule('../../src/models/index.js', () => ({
  Usuario: mockUsuario,
  Gasto: {},
  GastoUnico: {},
  Compra: {},
  GastoRecurrente: {},
  DebitoAutomatico: {},
  Tarjeta: {},
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  FrecuenciaGasto: {},
  Ingreso: {},
  TipoCambio: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true)
  }
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import app after mocking
const { default: app } = await import('../../app.js');

describe('Authentication Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    testUser = {
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      password: '$2b$10$hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
      dataValues: {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword'
      }
    };
  });

  describe('Complete Auth Flow: Register → Login → Access Protected Route', () => {
    it('should complete full authentication flow successfully', async () => {
      // Step 1: Register new user
      mockUsuario.findOne.mockResolvedValueOnce(null); // Email doesn't exist
      mockUsuario.create.mockResolvedValueOnce({
        ...testUser,
        save: jest.fn()
      });

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'newuser@example.com',
          password: 'Password123'
        })
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: expect.objectContaining({
            id: expect.any(Number),
            nombre: 'Test User',
            email: expect.any(String)
          })
        }
      });
      expect(registerResponse.body.data.user.password).toBeUndefined();

      // Step 2: Login with registered user
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        success: true,
        message: 'Login exitoso',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(Number),
            email: expect.any(String)
          })
        }
      });

      authToken = loginResponse.body.data.token;
      expect(authToken).toBeTruthy();

      // Step 3: Access protected route with token
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: {
          id: 1,
          nombre: 'Test User',
          email: 'newuser@example.com'
        }
      });

      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          user: expect.objectContaining({
            id: expect.any(Number),
            email: expect.any(String)
          })
        }
      });
    });

    it('should reject access to protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
    });

    it('should reject access to protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Token inválido o expirado',
        error: 'INVALID_TOKEN'
      });
    });
  });

  describe('Registration Flow', () => {
    it('should register user with valid data', async () => {
      mockUsuario.findOne.mockResolvedValueOnce(null);
      mockUsuario.create.mockResolvedValueOnce({
        ...testUser,
        save: jest.fn()
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'New User',
          email: 'newuser@example.com',
          password: 'Password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject registration with existing email', async () => {
      mockUsuario.findOne.mockResolvedValueOnce(testUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email ya está registrado',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'invalid-email',
          password: 'Password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with short name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'A',
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Login Flow', () => {
    it('should login with correct credentials', async () => {
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login exitoso',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(Number)
          })
        }
      });
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email o contraseña incorrectos',
        error: 'INVALID_CREDENTIALS'
      });
    });

    it('should reject login with non-existent email', async () => {
      mockUsuario.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email o contraseña incorrectos',
        error: 'INVALID_CREDENTIALS'
      });
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // password missing
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Profile Management Flow', () => {
    beforeEach(async () => {
      // Setup: Login to get token
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: {
          id: 1,
          nombre: 'Test User',
          email: 'test@example.com'
        }
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: expect.objectContaining({
            id: expect.any(Number),
            email: 'test@example.com'
          })
        }
      });
    });

    it('should update user profile', async () => {
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: { ...testUser.dataValues }
      });
      mockUsuario.findOne.mockResolvedValueOnce(null); // Email not in use
      mockUsuario.update = jest.fn().mockResolvedValueOnce([1]);
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        nombre: 'Updated Name',
        dataValues: {
          id: 1,
          nombre: 'Updated Name',
          email: 'test@example.com'
        }
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Updated Name'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Perfil actualizado exitosamente'
      });
    });

    it('should reject profile update with email already in use', async () => {
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: { ...testUser.dataValues }
      });
      mockUsuario.findOne.mockResolvedValueOnce({
        id: 2,
        email: 'other@example.com'
      }); // Email in use by another user

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'other@example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email ya está en uso',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    });
  });

  describe('Password Change Flow', () => {
    beforeEach(async () => {
      // Setup: Login to get token
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should change password with correct current password', async () => {
      const hashedOldPassword = await bcrypt.hash('Password123', 10);

      mockUsuario.findByPk
        .mockResolvedValueOnce({
          ...testUser,
          dataValues: { ...testUser.dataValues }
        })
        .mockResolvedValueOnce({
          ...testUser,
          password: hashedOldPassword
        });

      mockUsuario.update = jest.fn().mockResolvedValueOnce([1]);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword456'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    });

    it('should reject password change with incorrect current password', async () => {
      const hashedOldPassword = await bcrypt.hash('Password123', 10);

      mockUsuario.findByPk
        .mockResolvedValueOnce({
          ...testUser,
          dataValues: { ...testUser.dataValues }
        })
        .mockResolvedValueOnce({
          ...testUser,
          password: hashedOldPassword
        });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword456'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_CURRENT_PASSWORD'
      });
    });

    it('should reject password change with weak new password', async () => {
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: { ...testUser.dataValues }
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired token', async () => {
      // This test would require mocking JWT with an expired token
      // For now, we test invalid token format
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_TOKEN'
      });
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      mockUsuario.findOne.mockResolvedValueOnce({
        ...testUser,
        password: await bcrypt.hash('Password123', 10)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout successfully', async () => {
      mockUsuario.findByPk.mockResolvedValueOnce({
        ...testUser,
        dataValues: { ...testUser.dataValues }
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    });

    it('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
