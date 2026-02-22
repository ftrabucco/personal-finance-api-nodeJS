import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the Gasto model
const mockGastoCreate = jest.fn();

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Gasto: {
    create: mockGastoCreate
  }
}));

// Mock logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import after mocks
const { ImmediateExpenseStrategy } = await import('../../../src/strategies/expenseGeneration/immediateStrategy.js');

describe('ImmediateExpenseStrategy', () => {
  let strategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new ImmediateExpenseStrategy();
  });

  describe('getType', () => {
    it('should return "unico"', () => {
      expect(strategy.getType()).toBe('unico');
    });
  });

  describe('validateSource', () => {
    it('should return truthy when all required fields are present', () => {
      const gastoUnico = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        monto: 1000,
        fecha: '2024-01-15'
      };
      expect(strategy.validateSource(gastoUnico)).toBeTruthy();
    });

    it('should return falsy when monto is missing', () => {
      const gastoUnico = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        fecha: '2024-01-15'
      };
      expect(strategy.validateSource(gastoUnico)).toBeFalsy();
    });

    it('should return falsy when fecha is missing', () => {
      const gastoUnico = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        monto: 1000
      };
      expect(strategy.validateSource(gastoUnico)).toBeFalsy();
    });

    it('should return falsy when base validation fails', () => {
      const gastoUnico = {
        monto: 1000,
        fecha: '2024-01-15'
        // Missing required base fields
      };
      expect(strategy.validateSource(gastoUnico)).toBeFalsy();
    });
  });

  describe('shouldGenerate', () => {
    it('should return true when not processed', async () => {
      const gastoUnico = { procesado: false };
      expect(await strategy.shouldGenerate(gastoUnico)).toBe(true);
    });

    it('should return false when already processed', async () => {
      const gastoUnico = { procesado: true };
      expect(await strategy.shouldGenerate(gastoUnico)).toBe(false);
    });

    it('should return true when procesado is undefined', async () => {
      const gastoUnico = {};
      expect(await strategy.shouldGenerate(gastoUnico)).toBe(true);
    });
  });

  describe('generate', () => {
    const validGastoUnico = {
      id: 1,
      categoria_gasto_id: 1,
      importancia_gasto_id: 2,
      tipo_pago_id: 3,
      tarjeta_id: 4,
      usuario_id: 5,
      descripcion: 'Test expense',
      monto: 1000,
      monto_ars: 1000,
      monto_usd: 10.5,
      moneda_origen: 'ARS',
      tipo_cambio_usado: 95.24,
      fecha: '2024-01-15'
    };

    it('should generate gasto with correct data', async () => {
      const mockGasto = { id: 100, monto_ars: 1000 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      const result = await strategy.generate(validGastoUnico);

      expect(result).toEqual(mockGasto);
      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria_gasto_id: 1,
          importancia_gasto_id: 2,
          tipo_pago_id: 3,
          tarjeta_id: 4,
          usuario_id: 5,
          descripcion: 'Test expense',
          tipo_origen: 'unico',
          id_origen: 1,
          fecha: '2024-01-15',
          monto_ars: 1000,
          monto_usd: 10.5,
          moneda_origen: 'ARS',
          tipo_cambio_usado: 95.24
        }),
        expect.any(Object)
      );
    });

    it('should use monto as fallback for monto_ars', async () => {
      const gastoSinMontoArs = {
        ...validGastoUnico,
        monto_ars: undefined
      };
      const mockGasto = { id: 100 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      await strategy.generate(gastoSinMontoArs);

      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_ars: 1000 // Uses monto as fallback
        }),
        expect.any(Object)
      );
    });

    it('should handle null monto_usd', async () => {
      const gastoSinUsd = {
        ...validGastoUnico,
        monto_usd: null
      };
      const mockGasto = { id: 100 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      await strategy.generate(gastoSinUsd);

      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_usd: null
        }),
        expect.any(Object)
      );
    });

    it('should throw error when source is invalid', async () => {
      const invalidGastoUnico = {
        id: 1,
        // Missing required fields
      };

      await expect(strategy.generate(invalidGastoUnico))
        .rejects.toThrow('GastoUnico inválido para generación');
    });

    it('should pass transaction to Gasto.create', async () => {
      const mockTransaction = { id: 'txn-123' };
      const mockGasto = { id: 100 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      await strategy.generate(validGastoUnico, mockTransaction);

      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          transaction: mockTransaction
        })
      );
    });

    it('should normalize fecha to YYYY-MM-DD format', async () => {
      const gastoWithDateObject = {
        ...validGastoUnico,
        fecha: new Date('2024-03-20T12:00:00Z')
      };
      const mockGasto = { id: 100 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      await strategy.generate(gastoWithDateObject);

      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha: '2024-03-20'
        }),
        expect.any(Object)
      );
    });

    it('should throw and propagate error from Gasto.create', async () => {
      mockGastoCreate.mockRejectedValue(new Error('Database error'));

      await expect(strategy.generate(validGastoUnico))
        .rejects.toThrow('Database error');
    });

    it('should use default ARS for moneda_origen when not provided', async () => {
      const gastoSinMoneda = {
        ...validGastoUnico,
        moneda_origen: undefined
      };
      const mockGasto = { id: 100 };
      mockGastoCreate.mockResolvedValue(mockGasto);

      await strategy.generate(gastoSinMoneda);

      expect(mockGastoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          moneda_origen: 'ARS'
        }),
        expect.any(Object)
      );
    });
  });
});
