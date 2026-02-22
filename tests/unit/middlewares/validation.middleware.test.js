import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock responseHelper
const mockSendValidationError = jest.fn();
jest.unstable_mockModule('../../../src/utils/responseHelper.js', () => ({
  sendValidationError: mockSendValidationError
}));

// Import after mocks
const {
  validateCreateCompra,
  validateCreateGastoRecurrente,
  validateCreateDebitoAutomatico,
  validateCreateGastoUnico,
  validateIdParam,
  validateGastoFilters
} = await import('../../../src/middlewares/validation.middleware.js');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/api/test',
      method: 'POST'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('validateCreateCompra', () => {
    const validCompra = {
      descripcion: 'Test compra',
      monto_total: 1000,
      fecha_compra: '2024-01-15',
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1,
      cantidad_cuotas: 3
    };

    it('should pass validation with valid data', () => {
      mockReq.body = { ...validCompra };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockSendValidationError).not.toHaveBeenCalled();
    });

    it('should fail when monto_total is missing', () => {
      mockReq.body = {
        ...validCompra,
        monto_total: undefined
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when monto_total is negative', () => {
      mockReq.body = {
        ...validCompra,
        monto_total: -100
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when fecha_compra is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockReq.body = {
        ...validCompra,
        fecha_compra: futureDate.toISOString()
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when cantidad_cuotas exceeds 60', () => {
      mockReq.body = {
        ...validCompra,
        cantidad_cuotas: 61
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when descripcion is too short', () => {
      mockReq.body = {
        ...validCompra,
        descripcion: 'ab'
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should set default moneda_origen to ARS', () => {
      mockReq.body = { ...validCompra };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockReq.body.moneda_origen).toBe('ARS');
    });

    it('should allow optional tarjeta_id', () => {
      mockReq.body = {
        ...validCompra,
        tarjeta_id: 5
      };

      validateCreateCompra(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.tarjeta_id).toBe(5);
    });
  });

  describe('validateCreateGastoRecurrente', () => {
    const validGastoRecurrente = {
      descripcion: 'Test recurrente',
      monto: 500,
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1,
      frecuencia_gasto_id: 1,
      dia_de_pago: 15
    };

    it('should pass validation with valid data', () => {
      mockReq.body = { ...validGastoRecurrente };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when dia_de_pago is missing', () => {
      mockReq.body = {
        ...validGastoRecurrente,
        dia_de_pago: undefined
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when dia_de_pago exceeds 31', () => {
      mockReq.body = {
        ...validGastoRecurrente,
        dia_de_pago: 32
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when dia_de_pago is less than 1', () => {
      mockReq.body = {
        ...validGastoRecurrente,
        dia_de_pago: 0
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when frecuencia_gasto_id is missing', () => {
      mockReq.body = {
        ...validGastoRecurrente,
        frecuencia_gasto_id: undefined
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should allow optional mes_de_pago for annual frequency', () => {
      mockReq.body = {
        ...validGastoRecurrente,
        mes_de_pago: 6
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateCreateDebitoAutomatico', () => {
    const validDebito = {
      descripcion: 'Test debito',
      monto: 300,
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1,
      frecuencia_gasto_id: 1,
      dia_de_pago: 10
    };

    it('should pass validation with valid data', () => {
      mockReq.body = { ...validDebito };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when monto is missing', () => {
      mockReq.body = {
        ...validDebito,
        monto: undefined
      };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should set activo to true by default', () => {
      mockReq.body = { ...validDebito };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);

      expect(mockReq.body.activo).toBe(true);
    });

    it('should reject unknown fields (schema uses unknown: false)', () => {
      // Note: debitoAutomaticoSchema uses .unknown(false), so unknown fields are rejected
      // fecha_inicio/fecha_fin/mes_de_pago are only valid in gastoRecurrenteSchema
      mockReq.body = {
        ...validDebito,
        fecha_inicio: '2024-01-01'
      };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should allow optional moneda_origen', () => {
      mockReq.body = {
        ...validDebito,
        moneda_origen: 'USD'
      };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.moneda_origen).toBe('USD');
    });
  });

  describe('validateCreateGastoUnico', () => {
    const validGastoUnico = {
      descripcion: 'Test unico',
      monto: 200,
      fecha: '2024-01-15',
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1
    };

    it('should pass validation with valid data', () => {
      mockReq.body = { ...validGastoUnico };

      validateCreateGastoUnico(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when fecha is missing', () => {
      mockReq.body = {
        ...validGastoUnico,
        fecha: undefined
      };

      validateCreateGastoUnico(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when monto is not positive', () => {
      mockReq.body = {
        ...validGastoUnico,
        monto: 0
      };

      validateCreateGastoUnico(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });
  });

  describe('validateIdParam', () => {
    it('should pass with valid numeric ID', () => {
      mockReq.params = { id: '123' };

      validateIdParam(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.params.id).toBe(123);
    });

    it('should fail with non-numeric ID', () => {
      mockReq.params = { id: 'abc' };

      validateIdParam(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail with negative ID', () => {
      mockReq.params = { id: '-5' };

      validateIdParam(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail with zero ID', () => {
      mockReq.params = { id: '0' };

      validateIdParam(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });
  });

  describe('validateGastoFilters', () => {
    it('should pass with no filters', () => {
      mockReq.query = {};

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with valid filters', () => {
      mockReq.query = {
        categoria_gasto_id: '1',
        limit: '10',
        offset: '0'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when limit exceeds 1000', () => {
      mockReq.query = {
        limit: '1001'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should fail when monto_max_ars is less than monto_min_ars', () => {
      mockReq.query = {
        monto_min_ars: '1000',
        monto_max_ars: '500'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should accept valid orderDirection values', () => {
      mockReq.query = {
        orderDirection: 'ASC'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid orderDirection', () => {
      mockReq.query = {
        orderDirection: 'INVALID'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockSendValidationError).toHaveBeenCalled();
    });

    it('should accept valid orderBy fields', () => {
      mockReq.query = {
        orderBy: 'fecha'
      };

      validateGastoFilters(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
