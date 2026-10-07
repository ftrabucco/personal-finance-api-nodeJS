import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockGasto = {
  create: jest.fn(),
  findOne: jest.fn()
};

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Gasto: mockGasto
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import after mocks
const { AutomaticDebitExpenseStrategy } = await import('../../../src/strategies/expenseGeneration/automaticDebitStrategy.js');

function makeDebit(overrides = {}) {
  return {
    id: 7,
    descripcion: 'Netflix',
    monto: 15000,
    monto_ars: 15000,
    monto_usd: 10,
    moneda_origen: 'ARS',
    tipo_cambio_referencia: 1500,
    categoria_gasto_id: 2,
    importancia_gasto_id: 3,
    tipo_pago_id: 4,
    tarjeta_id: null,
    usuario_id: 10,
    frecuencia_gasto_id: 1,
    dia_de_pago: 15,
    activo: true,
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('AutomaticDebitExpenseStrategy', () => {
  let strategy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGasto.findOne.mockResolvedValue(null);
    mockGasto.create.mockImplementation(async (data) => ({ id: 99, ...data }));
    strategy = new AutomaticDebitExpenseStrategy();
  });

  describe('getType', () => {
    it('should identify generated expenses as debito_automatico', () => {
      expect(strategy.getType()).toBe('debito_automatico');
    });
  });

  describe('validateSource', () => {
    it('should accept an active debit with a positive amount', () => {
      expect(strategy.validateSource(makeDebit())).toBeTruthy();
    });

    it('should reject an inactive debit', () => {
      expect(strategy.validateSource(makeDebit({ activo: false }))).toBeFalsy();
    });

    it('should reject a debit without amount', () => {
      expect(strategy.validateSource(makeDebit({ monto: 0 }))).toBeFalsy();
    });
  });

  describe('generate - multi-currency fields', () => {
    it('should copy moneda_origen and tipo_cambio_usado from a USD debit', async () => {
      const debit = makeDebit({ moneda_origen: 'USD', monto_ars: 27900, monto_usd: 20, tipo_cambio_referencia: 1395 });

      await strategy.generate(debit, null, '2026-08-08');

      expect(mockGasto.create).toHaveBeenCalledTimes(1);
      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.moneda_origen).toBe('USD');
      expect(gastoData.tipo_cambio_usado).toBe(1395);
      expect(gastoData.monto_ars).toBe(27900);
      expect(gastoData.monto_usd).toBe(20);
    });

    it('should copy moneda_origen and tipo_cambio_usado from an ARS debit', async () => {
      const debit = makeDebit({ moneda_origen: 'ARS', tipo_cambio_referencia: 1560 });

      await strategy.generate(debit, null, '2026-08-08');

      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.moneda_origen).toBe('ARS');
      expect(gastoData.tipo_cambio_usado).toBe(1560);
    });

    it('should default moneda_origen to ARS when the debit has none', async () => {
      const debit = makeDebit({ moneda_origen: undefined });

      await strategy.generate(debit, null, '2026-08-08');

      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.moneda_origen).toBe('ARS');
    });

    it('should set tipo_cambio_usado to null when the debit has no reference rate', async () => {
      const debit = makeDebit({ tipo_cambio_referencia: null });

      await strategy.generate(debit, null, '2026-08-08');

      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.tipo_cambio_usado).toBeNull();
    });

    it('should include the multi-currency fields in the fields passed to Gasto.create', async () => {
      await strategy.generate(makeDebit({ moneda_origen: 'USD' }), null, '2026-08-08');

      const [, options] = mockGasto.create.mock.calls[0];
      expect(options.fields).toEqual(expect.arrayContaining(['moneda_origen', 'tipo_cambio_usado']));
    });
  });

  describe('generate - expense data', () => {
    it('should create the expense with the debit data and the target date', async () => {
      const debit = makeDebit();

      const gasto = await strategy.generate(debit, null, '2026-08-08');

      expect(gasto).not.toBeNull();
      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData).toMatchObject({
        fecha: '2026-08-08',
        descripcion: 'Netflix',
        tipo_origen: 'debito_automatico',
        id_origen: 7,
        usuario_id: 10,
        categoria_gasto_id: 2,
        importancia_gasto_id: 3,
        tipo_pago_id: 4,
        frecuencia_gasto_id: 1
      });
    });

    it('should fall back to monto when monto_ars is missing', async () => {
      const debit = makeDebit({ monto_ars: null, monto: 8000 });

      await strategy.generate(debit, null, '2026-08-08');

      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.monto_ars).toBe(8000);
    });

    it('should store a null monto_usd when the debit has none', async () => {
      const debit = makeDebit({ monto_usd: null });

      await strategy.generate(debit, null, '2026-08-08');

      const [gastoData] = mockGasto.create.mock.calls[0];
      expect(gastoData.monto_usd).toBeNull();
    });

    it('should pass the transaction to Gasto.create', async () => {
      const transaction = { id: 'tx' };

      await strategy.generate(makeDebit(), transaction, '2026-08-08');

      const [, options] = mockGasto.create.mock.calls[0];
      expect(options.transaction).toBe(transaction);
    });

    it('should update ultima_fecha_generado with the target date', async () => {
      const debit = makeDebit();

      await strategy.generate(debit, null, '2026-08-08');

      expect(debit.update).toHaveBeenCalledWith({ ultima_fecha_generado: '2026-08-08' }, { transaction: null });
    });
  });

  describe('generate - guards', () => {
    it('should return null and not create anything for an invalid source', async () => {
      const gasto = await strategy.generate(makeDebit({ activo: false }), null, '2026-08-08');

      expect(gasto).toBeNull();
      expect(mockGasto.create).not.toHaveBeenCalled();
    });

    it('should not create a duplicate when the month already has an expense', async () => {
      mockGasto.findOne.mockResolvedValue({ id: 50, fecha: '2026-08-02' });
      const debit = makeDebit();

      const gasto = await strategy.generate(debit, null, '2026-08-08');

      expect(gasto).toBeNull();
      expect(mockGasto.create).not.toHaveBeenCalled();
      expect(debit.update).toHaveBeenCalledWith({ ultima_fecha_generado: '2026-08-08' }, { transaction: null });
    });

    it('should look for an existing expense of the same debit inside the target month', async () => {
      await strategy.generate(makeDebit(), null, '2026-08-08');

      const [query] = mockGasto.findOne.mock.calls[0];
      expect(query.where.tipo_origen).toBe('debito_automatico');
      expect(query.where.id_origen).toBe(7);
    });

    it('should rethrow when creating the expense fails', async () => {
      mockGasto.create.mockRejectedValue(new Error('db down'));

      await expect(strategy.generate(makeDebit(), null, '2026-08-08')).rejects.toThrow('db down');
    });
  });
});
