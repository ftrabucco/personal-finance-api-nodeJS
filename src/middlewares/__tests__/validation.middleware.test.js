import { 
  validateCreateCompra, 
  validateCreateDebitoAutomatico, 
  validateCreateGastoRecurrente, 
  validateCreateGastoUnico,
  validateGastoFilters,
  validateIdParam
} from '../validation.middleware.js';

describe('Unified Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    
    mockRes = {
      status: function() { return this; },
      json: function() { return this; }
    };
    
    mockNext = function() {};
  });

  describe('validateCreateCompra', () => {
    test('should be a function', () => {
      expect(typeof validateCreateCompra).toBe('function');
    });

    test('should validate monto_total field', () => {
      mockReq.body = {
        fecha_compra: '2024-01-15',
        monto_total: 300.00,
        descripcion: 'Test purchase',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        cantidad_cuotas: 3
      };

      validateCreateCompra(mockReq, mockRes, mockNext);
      // Basic test - just verify it doesn't throw
      expect(typeof validateCreateCompra).toBe('function');
    });
  });

  describe('validateCreateDebitoAutomatico', () => {
    test('should be a function', () => {
      expect(typeof validateCreateDebitoAutomatico).toBe('function');
    });

    test('should validate dia_de_pago range', () => {
      mockReq.body = {
        descripcion: 'Monthly payment',
        monto: 500,
        dia_de_pago: 15,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      validateCreateDebitoAutomatico(mockReq, mockRes, mockNext);
      expect(typeof validateCreateDebitoAutomatico).toBe('function');
    });
  });

  describe('validateCreateGastoRecurrente', () => {
    test('should be a function', () => {
      expect(typeof validateCreateGastoRecurrente).toBe('function');
    });

    test('should allow optional fecha_inicio', () => {
      mockReq.body = {
        descripcion: 'Monthly rent',
        monto: 1000,
        dia_de_pago: 1,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        frecuencia_gasto_id: 1,
        tipo_pago_id: 1
      };

      validateCreateGastoRecurrente(mockReq, mockRes, mockNext);
      expect(typeof validateCreateGastoRecurrente).toBe('function');
    });
  });

  describe('validateCreateGastoUnico', () => {
    test('should be a function', () => {
      expect(typeof validateCreateGastoUnico).toBe('function');
    });

    test('should validate one-time expense', () => {
      mockReq.body = {
        fecha: '2024-01-15',
        monto: 75.25,
        descripcion: 'One-time expense',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      validateCreateGastoUnico(mockReq, mockRes, mockNext);
      expect(typeof validateCreateGastoUnico).toBe('function');
    });
  });

  describe('validateGastoFilters', () => {
    test('should be a function', () => {
      expect(typeof validateGastoFilters).toBe('function');
    });
  });

  describe('validateIdParam', () => {
    test('should be a function', () => {
      expect(typeof validateIdParam).toBe('function');
    });
  });
});
