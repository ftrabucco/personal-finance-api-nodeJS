import { describe, it, expect } from '@jest/globals';
import { BaseExpenseGenerationStrategy } from '../../../src/strategies/expenseGeneration/baseStrategy.js';

describe('BaseExpenseGenerationStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new BaseExpenseGenerationStrategy();
  });

  describe('generate', () => {
    it('should throw error when not implemented', async () => {
      await expect(strategy.generate({})).rejects.toThrow('Method generate() must be implemented by subclass');
    });
  });

  describe('shouldGenerate', () => {
    it('should throw error when not implemented', async () => {
      await expect(strategy.shouldGenerate({})).rejects.toThrow('Method shouldGenerate() must be implemented by subclass');
    });
  });

  describe('getType', () => {
    it('should throw error when not implemented', () => {
      expect(() => strategy.getType()).toThrow('Method getType() must be implemented by subclass');
    });
  });

  describe('validateSource', () => {
    it('should return truthy when all required fields are present', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1
      };
      expect(strategy.validateSource(source)).toBeTruthy();
    });

    it('should return falsy when categoria_gasto_id is missing', () => {
      const source = {
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when importancia_gasto_id is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when tipo_pago_id is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        usuario_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when usuario_id is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when source is null', () => {
      expect(strategy.validateSource(null)).toBeFalsy();
    });

    it('should return falsy when source is undefined', () => {
      expect(strategy.validateSource(undefined)).toBeFalsy();
    });
  });

  describe('createGastoData', () => {
    // Create a concrete subclass for testing
    class TestStrategy extends BaseExpenseGenerationStrategy {
      getType() {
        return 'test';
      }
    }

    it('should create gasto data with required fields', () => {
      const testStrategy = new TestStrategy();
      const source = {
        id: 123,
        categoria_gasto_id: 1,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        tarjeta_id: 4,
        descripcion: 'Test expense',
        usuario_id: 5
      };

      const result = testStrategy.createGastoData(source);

      expect(result.categoria_gasto_id).toBe(1);
      expect(result.importancia_gasto_id).toBe(2);
      expect(result.tipo_pago_id).toBe(3);
      expect(result.tarjeta_id).toBe(4);
      expect(result.descripcion).toBe('Test expense');
      expect(result.tipo_origen).toBe('test');
      expect(result.id_origen).toBe(123);
      expect(result.usuario_id).toBe(5);
    });

    it('should merge additional data', () => {
      const testStrategy = new TestStrategy();
      const source = {
        id: 123,
        categoria_gasto_id: 1,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        usuario_id: 5
      };

      const result = testStrategy.createGastoData(source, {
        monto_ars: 1000,
        fecha: '2024-01-15'
      });

      expect(result.monto_ars).toBe(1000);
      expect(result.fecha).toBe('2024-01-15');
    });

    it('should override base fields with additional data', () => {
      const testStrategy = new TestStrategy();
      const source = {
        id: 123,
        categoria_gasto_id: 1,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        descripcion: 'Original description',
        usuario_id: 5
      };

      const result = testStrategy.createGastoData(source, {
        descripcion: 'Custom description'
      });

      expect(result.descripcion).toBe('Custom description');
    });

    it('should handle null tarjeta_id', () => {
      const testStrategy = new TestStrategy();
      const source = {
        id: 123,
        categoria_gasto_id: 1,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        tarjeta_id: null,
        usuario_id: 5
      };

      const result = testStrategy.createGastoData(source);

      expect(result.tarjeta_id).toBeNull();
    });
  });
});
