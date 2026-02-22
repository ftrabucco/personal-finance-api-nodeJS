import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import moment from 'moment-timezone';

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
const { BaseRecurringStrategy } = await import('../../../src/strategies/expenseGeneration/baseRecurringStrategy.js');

// Create a concrete implementation for testing
class TestRecurringStrategy extends BaseRecurringStrategy {
  constructor() {
    super();
    this.Gasto = {
      create: jest.fn().mockResolvedValue({ id: 100, monto_ars: 1000 })
    };
  }

  getType() {
    return 'test_recurring';
  }
}

describe('BaseRecurringStrategy', () => {
  let strategy;

  // Get current date info for tests
  const now = moment().tz('America/Argentina/Buenos_Aires');
  const todayDay = now.date();
  const todayMonth = now.month() + 1;
  const todayDateStr = now.format('YYYY-MM-DD');
  const yesterdayDateStr = now.clone().subtract(1, 'day').format('YYYY-MM-DD');
  const futureDate = now.clone().add(1, 'month').format('YYYY-MM-DD');
  const pastDate = now.clone().subtract(1, 'month').format('YYYY-MM-DD');

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new TestRecurringStrategy();
  });

  describe('validateSource', () => {
    it('should return truthy when all required fields are present', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        monto: 1000,
        dia_de_pago: 15,
        frecuencia_gasto_id: 1
      };
      expect(strategy.validateSource(source)).toBeTruthy();
    });

    it('should return falsy when monto is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        dia_de_pago: 15,
        frecuencia_gasto_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when dia_de_pago is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        monto: 1000,
        frecuencia_gasto_id: 1
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });

    it('should return falsy when frecuencia_gasto_id is missing', () => {
      const source = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        usuario_id: 1,
        monto: 1000,
        dia_de_pago: 15
      };
      expect(strategy.validateSource(source)).toBeFalsy();
    });
  });

  describe('shouldGenerate', () => {
    it('should return false when source is not active', async () => {
      const source = {
        id: 1,
        activo: false,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1
      };
      expect(await strategy.shouldGenerate(source)).toBe(false);
    });

    it('should return false when not the payment day', async () => {
      const differentDay = todayDay === 1 ? 28 : 1;
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: differentDay,
        frecuencia_gasto_id: 1
      };
      expect(await strategy.shouldGenerate(source)).toBe(false);
    });

    it('should return true when it is the payment day and active', async () => {
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1
      };
      expect(await strategy.shouldGenerate(source)).toBe(true);
    });

    it('should return false for annual frequency when not the correct month', async () => {
      const differentMonth = todayMonth === 1 ? 6 : 1;
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1,
        mes_de_pago: differentMonth
      };
      expect(await strategy.shouldGenerate(source)).toBe(false);
    });

    it('should return true for annual frequency when correct month and day', async () => {
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1,
        mes_de_pago: todayMonth
      };
      expect(await strategy.shouldGenerate(source)).toBe(true);
    });

    it('should return false when already generated today', async () => {
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1,
        ultima_fecha_generado: todayDateStr
      };
      expect(await strategy.shouldGenerate(source)).toBe(false);
    });

    it('should return true when last generated on different day', async () => {
      const source = {
        id: 1,
        activo: true,
        dia_de_pago: todayDay,
        frecuencia_gasto_id: 1,
        ultima_fecha_generado: yesterdayDateStr
      };
      expect(await strategy.shouldGenerate(source)).toBe(true);
    });
  });

  describe('validateDateBoundaries', () => {
    it('should return true when no date boundaries', () => {
      const source = { id: 1 };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });

    it('should return false when today is before fecha_inicio', () => {
      const source = { id: 1, fecha_inicio: futureDate };
      expect(strategy.validateDateBoundaries(source, now)).toBe(false);
    });

    it('should return true when today is after fecha_inicio', () => {
      const source = { id: 1, fecha_inicio: pastDate };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });

    it('should return true when today equals fecha_inicio', () => {
      const source = { id: 1, fecha_inicio: todayDateStr };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });

    it('should return false when today is after fecha_fin', () => {
      const source = { id: 1, fecha_fin: pastDate };
      expect(strategy.validateDateBoundaries(source, now)).toBe(false);
    });

    it('should return true when today is before fecha_fin', () => {
      const source = { id: 1, fecha_fin: futureDate };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });

    it('should return true when today equals fecha_fin', () => {
      const source = { id: 1, fecha_fin: todayDateStr };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });

    it('should check both boundaries when both are present', () => {
      const source = {
        id: 1,
        fecha_inicio: pastDate,
        fecha_fin: futureDate
      };
      expect(strategy.validateDateBoundaries(source, now)).toBe(true);
    });
  });

  describe('updateLastGeneratedDate', () => {
    it('should update the source with new date', async () => {
      const mockUpdate = jest.fn().mockResolvedValue();
      const source = { id: 1, update: mockUpdate };
      const mockTransaction = { id: 'txn' };

      await strategy.updateLastGeneratedDate(source, '2024-01-15', mockTransaction);

      expect(mockUpdate).toHaveBeenCalledWith(
        { ultima_fecha_generado: '2024-01-15' },
        { transaction: mockTransaction }
      );
    });
  });

  describe('generateRecurringExpenseWithDate', () => {
    const createValidSource = () => ({
      id: 1,
      categoria_gasto_id: 1,
      importancia_gasto_id: 2,
      tipo_pago_id: 3,
      tarjeta_id: 4,
      usuario_id: 5,
      descripcion: 'Test recurring',
      monto: 1000,
      monto_ars: 1000,
      monto_usd: 10.5,
      moneda_origen: 'ARS',
      tipo_cambio_referencia: 95.24,
      dia_de_pago: 15,
      frecuencia_gasto_id: 1,
      update: jest.fn().mockResolvedValue()
    });

    it('should generate expense with correct data', async () => {
      const validSource = createValidSource();
      const result = await strategy.generateRecurringExpenseWithDate(
        validSource,
        { frecuencia_gasto_id: 1 },
        '2024-01-15',
        null
      );

      expect(result).toEqual({ id: 100, monto_ars: 1000 });
      expect(strategy.Gasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria_gasto_id: 1,
          importancia_gasto_id: 2,
          tipo_pago_id: 3,
          tarjeta_id: 4,
          usuario_id: 5,
          descripcion: 'Test recurring',
          tipo_origen: 'test_recurring',
          id_origen: 1,
          fecha: '2024-01-15',
          monto_ars: 1000,
          monto_usd: 10.5,
          moneda_origen: 'ARS'
        }),
        expect.any(Object)
      );
    });

    it('should return null when source validation fails', async () => {
      const invalidSource = { id: 1 };

      const result = await strategy.generateRecurringExpenseWithDate(
        invalidSource,
        {},
        '2024-01-15',
        null
      );

      expect(result).toBeNull();
      expect(strategy.Gasto.create).not.toHaveBeenCalled();
    });

    it('should update last generated date after creating expense', async () => {
      const validSource = createValidSource();
      await strategy.generateRecurringExpenseWithDate(
        validSource,
        { frecuencia_gasto_id: 1 },
        '2024-01-15',
        null
      );

      expect(validSource.update).toHaveBeenCalledWith(
        { ultima_fecha_generado: '2024-01-15' },
        { transaction: null }
      );
    });

    it('should use monto as fallback for monto_ars', async () => {
      const sourceWithoutMontoArs = createValidSource();
      sourceWithoutMontoArs.monto_ars = undefined;

      await strategy.generateRecurringExpenseWithDate(
        sourceWithoutMontoArs,
        {},
        '2024-01-15',
        null
      );

      expect(strategy.Gasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_ars: 1000 // Uses monto as fallback
        }),
        expect.any(Object)
      );
    });

    it('should throw and propagate database errors', async () => {
      strategy.Gasto.create.mockRejectedValue(new Error('DB Error'));
      const validSource = createValidSource();

      await expect(
        strategy.generateRecurringExpenseWithDate(validSource, {}, '2024-01-15', null)
      ).rejects.toThrow('DB Error');
    });
  });

  describe('generateRecurringExpense', () => {
    it('should use today date for generation', async () => {
      const validSource = {
        id: 1,
        categoria_gasto_id: 1,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        usuario_id: 5,
        monto: 1000,
        dia_de_pago: 15,
        frecuencia_gasto_id: 1,
        update: jest.fn().mockResolvedValue()
      };

      await strategy.generateRecurringExpense(validSource, {}, null);

      expect(strategy.Gasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha: todayDateStr
        }),
        expect.any(Object)
      );
    });
  });
});
