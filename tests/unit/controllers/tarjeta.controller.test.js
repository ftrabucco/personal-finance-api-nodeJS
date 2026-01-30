import { jest } from '@jest/globals';

/**
 * Unit tests for TarjetaController
 * Tests HTTP request handling and controller logic
 */

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockTarjeta = {
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
};

const mockTarjetaService = {
  findByIdAndUser: jest.fn(),
  getWithFilters: jest.fn(),
  validateTarjetaData: jest.fn(),
  normalizeTarjetaData: jest.fn(),
  validateTarjetaUsage: jest.fn(),
  getUserCardStats: jest.fn()
};

const mockResponseHelper = {
  sendError: jest.fn(),
  sendSuccess: jest.fn(),
  sendPaginatedSuccess: jest.fn(),
  sendValidationError: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Tarjeta: mockTarjeta
}));

jest.unstable_mockModule('../../../src/services/tarjeta.service.js', () => ({
  TarjetaService: class {
    constructor() {
      return mockTarjetaService;
    }
  }
}));

jest.unstable_mockModule('../../../src/utils/responseHelper.js', () => mockResponseHelper);

jest.unstable_mockModule('../../../src/controllers/api/base.controller.js', () => ({
  BaseController: class {
    constructor(model, modelName) {
      this.model = model;
      this.modelName = modelName;
    }
    getIncludes() {
      return [];
    }
    getRelationships() {
      return {};
    }
  }
}));

// Import controller after mocking
const { TarjetaController } = await import('../../../src/controllers/api/tarjeta.controller.js');

describe('TarjetaController', () => {
  let tarjetaController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    tarjetaController = new TarjetaController();

    mockReq = {
      user: { id: 1 },
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Constructor', () => {
    test('should instantiate with correct model and service', () => {
      expect(tarjetaController.model).toBe(mockTarjeta);
      expect(tarjetaController.tarjetaService).toBeDefined();
    });

    test('should have correct includes and relationships', () => {
      expect(tarjetaController.getIncludes()).toEqual([]);
      expect(tarjetaController.getRelationships()).toEqual({});
    });
  });

  describe('getWithFilters', () => {
    test('should return success response without pagination', async () => {
      const mockResult = {
        data: [{ id: 1, nombre: 'Visa' }],
        meta: { total: 1, limit: null }
      };
      mockTarjetaService.getWithFilters.mockResolvedValue(mockResult);

      await tarjetaController.getWithFilters(mockReq, mockRes);

      expect(mockTarjetaService.getWithFilters).toHaveBeenCalledWith(mockReq.query, 1);
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, mockResult.data);
    });

    test('should return paginated response when limit is set', async () => {
      const mockResult = {
        data: [{ id: 1, nombre: 'Visa' }],
        meta: { total: 10, limit: 5 }
      };
      mockTarjetaService.getWithFilters.mockResolvedValue(mockResult);

      await tarjetaController.getWithFilters(mockReq, mockRes);

      expect(mockResponseHelper.sendPaginatedSuccess).toHaveBeenCalledWith(
        mockRes,
        mockResult.data,
        mockResult.meta
      );
    });

    test('should handle service errors', async () => {
      const error = new Error('Service error');
      mockTarjetaService.getWithFilters.mockRejectedValue(error);

      await tarjetaController.getWithFilters(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener tarjetas con filtros:',
        { error, userId: 1 }
      );
      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        500,
        'Error al obtener tarjetas',
        error.message
      );
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
    });

    test('should return tarjeta when found', async () => {
      const mockTarjeta = { id: 1, nombre: 'Visa', usuario_id: 1 };
      mockTarjetaService.findByIdAndUser.mockResolvedValue(mockTarjeta);

      await tarjetaController.getById(mockReq, mockRes);

      expect(mockTarjetaService.findByIdAndUser).toHaveBeenCalledWith('1', 1);
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, mockTarjeta);
    });

    test('should return 404 when tarjeta not found', async () => {
      mockTarjetaService.findByIdAndUser.mockResolvedValue(null);

      await tarjetaController.getById(mockReq, mockRes);

      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        404,
        'Tarjeta no encontrada'
      );
    });

    test('should handle service errors', async () => {
      const error = new Error('Service error');
      mockTarjetaService.findByIdAndUser.mockRejectedValue(error);

      await tarjetaController.getById(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener tarjeta por ID:',
        { error, tarjetaId: '1', userId: 1 }
      );
      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        500,
        'Error al obtener tarjeta',
        error.message
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockReq.body = {
        nombre: 'Visa Credit',
        banco: 'Banco Nacion',
        tipo: 'credito',
        dia_mes_cierre: 15,
        dia_mes_vencimiento: 10
      };
    });

    test('should create tarjeta successfully', async () => {
      const normalizedData = { ...mockReq.body, permite_cuotas: true };
      const createdTarjeta = { id: 1, ...normalizedData, usuario_id: 1 };

      mockTarjetaService.normalizeTarjetaData.mockReturnValue(normalizedData);
      mockTarjeta.create.mockResolvedValue(createdTarjeta);

      await tarjetaController.create(mockReq, mockRes);

      expect(mockTarjetaService.normalizeTarjetaData).toHaveBeenCalledWith(mockReq.body);
      expect(mockTarjeta.create).toHaveBeenCalledWith({
        ...normalizedData,
        usuario_id: 1
      });
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, createdTarjeta, 201);
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockTarjetaService.normalizeTarjetaData.mockReturnValue(mockReq.body);
      mockTarjeta.create.mockRejectedValue(error);

      await tarjetaController.create(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al crear tarjeta:',
        { error, userId: 1, data: mockReq.body }
      );
      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        500,
        'Error al crear tarjeta',
        error.message
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
      mockReq.body = {
        nombre: 'Updated Visa',
        banco: 'Updated Bank'
      };
    });

    test('should update tarjeta successfully', async () => {
      const existingTarjeta = {
        id: 1,
        nombre: 'Old Visa',
        usuario_id: 1,
        update: jest.fn().mockResolvedValue()
      };
      const normalizedData = { ...mockReq.body };

      mockTarjetaService.findByIdAndUser.mockResolvedValue(existingTarjeta);
      mockTarjetaService.normalizeTarjetaData.mockReturnValue(normalizedData);

      await tarjetaController.update(mockReq, mockRes);

      expect(mockTarjetaService.findByIdAndUser).toHaveBeenCalledWith('1', 1);
      expect(existingTarjeta.update).toHaveBeenCalledWith(normalizedData);
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, existingTarjeta);
    });

    test('should return 404 when tarjeta not found', async () => {
      mockTarjetaService.findByIdAndUser.mockResolvedValue(null);

      await tarjetaController.update(mockReq, mockRes);

      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        404,
        'Tarjeta no encontrada'
      );
    });

    test('should remove usuario_id from normalized data', async () => {
      const existingTarjeta = {
        id: 1,
        usuario_id: 1,
        update: jest.fn().mockResolvedValue()
      };
      const normalizedData = {
        ...mockReq.body,
        usuario_id: 999  // Should be removed
      };

      mockTarjetaService.findByIdAndUser.mockResolvedValue(existingTarjeta);
      mockTarjetaService.normalizeTarjetaData.mockReturnValue(normalizedData);

      await tarjetaController.update(mockReq, mockRes);

      const expectedData = { ...normalizedData };
      delete expectedData.usuario_id;
      expect(existingTarjeta.update).toHaveBeenCalledWith(expectedData);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
    });

    test('should delete tarjeta when not in use', async () => {
      const existingTarjeta = {
        id: 1,
        nombre: 'Visa',
        tipo: 'credito',
        destroy: jest.fn().mockResolvedValue()
      };
      const usageValidation = {
        inUse: false,
        usage: { gastos: 0, compras: 0, total: 0 }
      };

      mockTarjetaService.findByIdAndUser.mockResolvedValue(existingTarjeta);
      mockTarjetaService.validateTarjetaUsage.mockResolvedValue(usageValidation);

      await tarjetaController.delete(mockReq, mockRes);

      expect(existingTarjeta.destroy).toHaveBeenCalled();
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, {
        message: 'Tarjeta eliminada exitosamente',
        tarjeta: {
          id: 1,
          nombre: 'Visa',
          tipo: 'credito'
        }
      });
    });

    test('should return 404 when tarjeta not found', async () => {
      mockTarjetaService.findByIdAndUser.mockResolvedValue(null);

      await tarjetaController.delete(mockReq, mockRes);

      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        404,
        'Tarjeta no encontrada'
      );
    });

    test('should prevent deletion when tarjeta is in use', async () => {
      const existingTarjeta = { id: 1, nombre: 'Visa' };
      const usageValidation = {
        inUse: true,
        usage: { gastos: 5, compras: 3, total: 8 }
      };

      mockTarjetaService.findByIdAndUser.mockResolvedValue(existingTarjeta);
      mockTarjetaService.validateTarjetaUsage.mockResolvedValue(usageValidation);

      await tarjetaController.delete(mockReq, mockRes);

      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        400,
        'No se puede eliminar la tarjeta',
        'La tarjeta está siendo utilizada en 8 registro(s) (5 gastos, 3 compras)'
      );
    });
  });

  describe('getStats', () => {
    test('should return user card statistics', async () => {
      const mockStats = {
        total: 5,
        credito: 2,
        debito: 2,
        virtual: 1
      };
      mockTarjetaService.getUserCardStats.mockResolvedValue(mockStats);

      await tarjetaController.getStats(mockReq, mockRes);

      expect(mockTarjetaService.getUserCardStats).toHaveBeenCalledWith(1);
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, {
        estadisticas: mockStats,
        usuario_id: 1
      });
    });

    test('should handle service errors', async () => {
      const error = new Error('Service error');
      mockTarjetaService.getUserCardStats.mockRejectedValue(error);

      await tarjetaController.getStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener estadísticas de tarjetas:',
        { error, userId: 1 }
      );
      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        500,
        'Error al obtener estadísticas',
        error.message
      );
    });
  });

  describe('validateUsage', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
    });

    test('should return usage validation for existing tarjeta', async () => {
      const existingTarjeta = {
        id: 1,
        nombre: 'Visa',
        tipo: 'credito'
      };
      const usageValidation = {
        inUse: true,
        usage: { gastos: 5, compras: 2, total: 7 }
      };

      mockTarjetaService.findByIdAndUser.mockResolvedValue(existingTarjeta);
      mockTarjetaService.validateTarjetaUsage.mockResolvedValue(usageValidation);

      await tarjetaController.validateUsage(mockReq, mockRes);

      expect(mockTarjetaService.validateTarjetaUsage).toHaveBeenCalledWith(1);
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, {
        tarjeta: {
          id: 1,
          nombre: 'Visa',
          tipo: 'credito'
        },
        ...usageValidation
      });
    });

    test('should return 404 when tarjeta not found', async () => {
      mockTarjetaService.findByIdAndUser.mockResolvedValue(null);

      await tarjetaController.validateUsage(mockReq, mockRes);

      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        404,
        'Tarjeta no encontrada'
      );
    });

    test('should handle service errors', async () => {
      const error = new Error('Service error');
      mockTarjetaService.findByIdAndUser.mockRejectedValue(error);

      await tarjetaController.validateUsage(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al validar uso de tarjeta:',
        { error, tarjetaId: '1', userId: 1 }
      );
      expect(mockResponseHelper.sendError).toHaveBeenCalledWith(
        mockRes,
        500,
        'Error al validar uso de tarjeta',
        error.message
      );
    });
  });
});