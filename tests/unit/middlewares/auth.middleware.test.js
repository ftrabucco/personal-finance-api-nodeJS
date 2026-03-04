import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock authService
const mockVerifyToken = jest.fn();
const mockGetUserById = jest.fn();

jest.unstable_mockModule('../../../src/services/auth.service.js', () => ({
  default: {
    verifyToken: mockVerifyToken,
    getUserById: mockGetUserById
  }
}));

// Mock logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import after mocks
const { authenticateToken, optionalAuth, requireRole, logAuthenticatedRequest } = await import('../../../src/middlewares/auth.middleware.js');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      method: 'GET',
      originalUrl: '/api/test'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should return 401 when no authorization header', async () => {
      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has no token after Bearer', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token de acceso requerido',
        error: 'INVALID_TOKEN_FORMAT'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate successfully with valid Bearer token', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockReq.headers.authorization = 'Bearer valid-token';
      mockVerifyToken.mockReturnValue({ id: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockGetUserById).toHaveBeenCalledWith(1);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate successfully with token without Bearer prefix', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockReq.headers.authorization = 'valid-token';
      mockVerifyToken.mockReturnValue({ id: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido o expirado',
        error: 'INVALID_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockVerifyToken.mockReturnValue({ id: 999 });
      mockGetUserById.mockRejectedValue(new Error('User not found'));

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido o expirado',
        error: 'INVALID_TOKEN'
      });
    });
  });

  describe('optionalAuth', () => {
    it('should set user to null when no authorization header', async () => {
      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user to null when empty token', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user when valid token provided', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockReq.headers.authorization = 'Bearer valid-token';
      mockVerifyToken.mockReturnValue({ id: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user to null when token verification fails but still continue', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
      // Should not return error response
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set user to null when getUserById fails but still continue', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockVerifyToken.mockReturnValue({ id: 999 });
      mockGetUserById.mockRejectedValue(new Error('User not found'));

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 when no user on request', () => {
      const middleware = requireRole('admin');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Acceso no autorizado',
        error: 'NO_USER'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user has wrong role', () => {
      mockReq.user = { id: 1, role: 'user' };
      const middleware = requireRole('admin');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Permisos insuficientes',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when user has correct role', () => {
      mockReq.user = { id: 1, role: 'admin' };
      const middleware = requireRole('admin');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('logAuthenticatedRequest', () => {
    it('should call next without logging when no user', () => {
      logAuthenticatedRequest(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log and call next when user exists', async () => {
      mockReq.user = { id: 1, email: 'test@example.com' };
      const logger = (await import('../../../src/utils/logger.js')).default;

      logAuthenticatedRequest(mockReq, mockRes, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Request autenticado', {
        userId: 1,
        email: 'test@example.com',
        endpoint: 'GET /api/test',
        ip: '127.0.0.1'
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
