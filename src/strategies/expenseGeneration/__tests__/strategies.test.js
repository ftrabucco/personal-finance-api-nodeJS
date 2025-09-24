import { jest } from '@jest/globals';
import moment from 'moment-timezone';

// Mock models
const mockGasto = {
  create: jest.fn(),
  count: jest.fn()
};

jest.unstable_mockModule('../../../models/index.js', () => ({
  Gasto: mockGasto
}));

// Import strategies after mocking
const { BaseExpenseGenerationStrategy } = await import('../baseStrategy.js');
const { ImmediateExpenseStrategy } = await import('../immediateStrategy.js');
const { RecurringExpenseStrategy } = await import('../recurringStrategy.js');
const { AutomaticDebitExpenseStrategy } = await import('../automaticDebitStrategy.js');
const { InstallmentExpenseStrategy } = await import('../installmentStrategy.js');

describe('Expense Generation Strategies', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
  });

  describe('BaseExpenseGenerationStrategy', () => {
    test('should be abstract base class', () => {
      const strategy = new BaseExpenseGenerationStrategy();
      expect(strategy).toBeDefined();
      expect(strategy.getType).toBeDefined();
      expect(strategy.validateSource).toBeDefined();
    });

    test('createGastoData should merge base data with overrides', () => {
      const strategy = new BaseExpenseGenerationStrategy();
      const source = {
        descripcion: 'Test expense',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        tarjeta_id: 1,
        id: 123
      };

      const overrides = {
        fecha: '2025-09-22',
        monto_ars: 1000
      };

      const result = strategy.createGastoData(source, overrides);

      expect(result).toEqual({
        descripcion: 'Test expense',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        tarjeta_id: 1,
        fecha: '2025-09-22',
        monto_ars: 1000,
        tipo_origen: strategy.getType(),
        id_origen: 123
      });
    });

    test('validateSource should validate required fields', () => {
      const strategy = new BaseExpenseGenerationStrategy();

      const validSource = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      const invalidSource = {
        categoria_gasto_id: 1
        // missing required fields
      };

      expect(strategy.validateSource(validSource)).toBe(true);
      expect(strategy.validateSource(invalidSource)).toBe(false);
    });
  });

  describe('ImmediateExpenseStrategy', () => {
    test('should generate expense immediately', async () => {
      const strategy = new ImmediateExpenseStrategy();
      const gastoUnico = {
        id: 1,
        descripcion: 'Immediate expense',
        monto: 500,
        fecha: '2025-09-22',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        tarjeta_id: null
      };

      const mockGastoResult = { id: 100, ...gastoUnico };
      mockGasto.create.mockResolvedValue(mockGastoResult);

      const result = await strategy.generate(gastoUnico, mockTransaction);

      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: gastoUnico.descripcion,
          monto_ars: gastoUnico.monto,
          fecha: gastoUnico.fecha,
          tipo_origen: 'gasto_unico',
          id_origen: gastoUnico.id
        }),
        { transaction: mockTransaction, fields: expect.any(Array) }
      );
      expect(result).toBe(mockGastoResult);
    });

    test('shouldGenerate should always return true', async () => {
      const strategy = new ImmediateExpenseStrategy();
      const gastoUnico = { procesado: false };

      const result = await strategy.shouldGenerate(gastoUnico);
      expect(result).toBe(true);
    });

    test('getType should return correct type', () => {
      const strategy = new ImmediateExpenseStrategy();
      expect(strategy.getType()).toBe('gasto_unico');
    });
  });

  describe('RecurringExpenseStrategy', () => {
    test('should generate recurring expense on correct day', async () => {
      const strategy = new RecurringExpenseStrategy();
      const today = moment().tz('America/Argentina/Buenos_Aires');

      const gastoRecurrente = {
        id: 1,
        descripcion: 'Monthly rent',
        monto: 50000,
        dia_de_pago: today.date(),
        mes_de_pago: null,
        activo: true,
        ultima_fecha_generado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        frecuencia_gasto_id: 1
      };

      const mockGastoResult = { id: 101, ...gastoRecurrente };
      mockGasto.create.mockResolvedValue(mockGastoResult);

      const result = await strategy.generate(gastoRecurrente, mockTransaction);

      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: gastoRecurrente.descripcion,
          monto_ars: gastoRecurrente.monto,
          tipo_origen: 'recurrente',
          id_origen: gastoRecurrente.id
        }),
        { transaction: mockTransaction, fields: expect.any(Array) }
      );
      expect(result).toBe(mockGastoResult);
    });

    test('shouldGenerate should check payment day', async () => {
      const strategy = new RecurringExpenseStrategy();
      const today = moment().tz('America/Argentina/Buenos_Aires');

      const validRecurring = {
        activo: true,
        dia_de_pago: today.date(),
        mes_de_pago: null,
        ultima_fecha_generado: null
      };

      const invalidRecurring = {
        activo: true,
        dia_de_pago: today.date() === 1 ? 2 : 1, // Different day
        mes_de_pago: null,
        ultima_fecha_generado: null
      };

      expect(await strategy.shouldGenerate(validRecurring)).toBe(true);
      expect(await strategy.shouldGenerate(invalidRecurring)).toBe(false);
    });

    test('getType should return correct type', () => {
      const strategy = new RecurringExpenseStrategy();
      expect(strategy.getType()).toBe('recurrente');
    });
  });

  describe('AutomaticDebitExpenseStrategy', () => {
    test('should generate automatic debit expense', async () => {
      const strategy = new AutomaticDebitExpenseStrategy();
      const today = moment().tz('America/Argentina/Buenos_Aires');

      const debitoAutomatico = {
        id: 1,
        descripcion: 'Netflix subscription',
        monto: 1500,
        dia_de_pago: today.date(),
        mes_de_pago: null,
        activo: true,
        ultima_fecha_generado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        frecuencia_gasto_id: 1
      };

      const mockGastoResult = { id: 102, ...debitoAutomatico };
      mockGasto.create.mockResolvedValue(mockGastoResult);

      const result = await strategy.generate(debitoAutomatico, mockTransaction);

      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: debitoAutomatico.descripcion,
          monto_ars: debitoAutomatico.monto,
          tipo_origen: 'debito_automatico',
          id_origen: debitoAutomatico.id
        }),
        { transaction: mockTransaction, fields: expect.any(Array) }
      );
      expect(result).toBe(mockGastoResult);
    });

    test('shouldGenerate should respect fecha_fin', async () => {
      const strategy = new AutomaticDebitExpenseStrategy();
      const today = moment().tz('America/Argentina/Buenos_Aires');
      const yesterday = today.clone().subtract(1, 'day').format('YYYY-MM-DD');

      const expiredDebit = {
        activo: true,
        dia_de_pago: today.date(),
        mes_de_pago: null,
        ultima_fecha_generado: null,
        fecha_fin: yesterday
      };

      expect(await strategy.shouldGenerate(expiredDebit)).toBe(false);
    });

    test('getType should return correct type', () => {
      const strategy = new AutomaticDebitExpenseStrategy();
      expect(strategy.getType()).toBe('debito_automatico');
    });
  });

  describe('InstallmentExpenseStrategy', () => {
    test('should generate single installment for credit card', async () => {
      const strategy = new InstallmentExpenseStrategy();
      const today = moment().tz('America/Argentina/Buenos_Aires');

      const compra = {
        id: 1,
        descripcion: 'Laptop purchase',
        monto_total: 150000,
        cantidad_cuotas: 1,
        fecha: today.clone().subtract(5, 'days').format('YYYY-MM-DD'),
        pendiente_cuotas: true,
        fecha_ultima_cuota_generada: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        tarjeta_id: 1,
        tarjeta: {
          tipo: 'credito',
          dia_vencimiento: today.date(),
          dia_cierre: 25
        }
      };

      mockGasto.count.mockResolvedValue(0); // No installments generated yet
      const mockGastoResult = { id: 103, ...compra };
      mockGasto.create.mockResolvedValue(mockGastoResult);

      const result = await strategy.generate(compra, mockTransaction);

      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: expect.stringContaining('Cuota 1/1'),
          monto_ars: compra.monto_total,
          tipo_origen: 'compra',
          id_origen: compra.id
        }),
        { transaction: mockTransaction, fields: expect.any(Array) }
      );
      expect(result).toBe(mockGastoResult);
    });

    test('should calculate installment amount correctly', async () => {
      const strategy = new InstallmentExpenseStrategy();

      const singleInstallment = { cantidad_cuotas: 1, monto_total: 1000 };
      const multipleInstallments = { cantidad_cuotas: 3, monto_total: 1500 };

      expect(await strategy.calculateInstallmentAmount(singleInstallment)).toBe(1000);
      expect(await strategy.calculateInstallmentAmount(multipleInstallments)).toBe(500);
    });

    test('should detect credit card payment correctly', () => {
      const strategy = new InstallmentExpenseStrategy();

      const creditCardPurchase = {
        tarjeta_id: 1,
        tarjeta: { tipo: 'credito' }
      };

      const debitCardPurchase = {
        tarjeta_id: 1,
        tarjeta: { tipo: 'debito' }
      };

      const cashPurchase = {
        tarjeta_id: null
      };

      expect(strategy.isCreditCardPayment(creditCardPurchase)).toBe(true);
      expect(strategy.isCreditCardPayment(debitCardPurchase)).toBe(false);
      expect(strategy.isCreditCardPayment(cashPurchase)).toBe(false);
    });

    test('getType should return correct type', () => {
      const strategy = new InstallmentExpenseStrategy();
      expect(strategy.getType()).toBe('compra');
    });

    test('should validate source correctly', () => {
      const strategy = new InstallmentExpenseStrategy();

      const validCompra = {
        monto_total: 1000,
        fecha: '2025-09-22',
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      const invalidCompra = {
        // missing monto_total and fecha
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      expect(strategy.validateSource(validCompra)).toBe(true);
      expect(strategy.validateSource(invalidCompra)).toBe(false);
    });
  });
});