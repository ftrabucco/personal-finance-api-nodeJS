import { jest } from '@jest/globals';
import moment from 'moment-timezone';

const mockIngresoUnico = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockGetRateForDate = jest.fn();
const mockCalculateBothCurrencies = jest.fn();

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  IngresoUnico: mockIngresoUnico,
}));

jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  default: {
    getRateForDate: mockGetRateForDate,
    calculateBothCurrencies: mockCalculateBothCurrencies,
  },
}));

const { RecurringIncomeStrategy } = await import('../../../src/strategies/incomeGeneration/recurringIncomeStrategy.js');

const TZ = 'America/Argentina/Buenos_Aires';

function makeIngresoRecurrente(overrides = {}) {
  return {
    id: 7,
    descripcion: 'Sueldo',
    monto: 3100,
    moneda_origen: 'USD',
    fuente_ingreso_id: 1,
    usuario_id: 1,
    dia_de_pago: 10,
    fecha_inicio: '2026-01-10',
    fecha_fin: null,
    ultima_fecha_generado: null,
    frecuencia: { nombre_frecuencia: 'mensual' },
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('RecurringIncomeStrategy', () => {
  let strategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new RecurringIncomeStrategy();
    mockIngresoUnico.create.mockImplementation(async (data) => ({ id: 99, ...data }));
  });

  describe('generateWithDate', () => {
    it('snapshots the historical rate for the target date, not a current one', async () => {
      const income = makeIngresoRecurrente();
      mockIngresoUnico.findOne.mockResolvedValue(null);
      const historicalRate = { valor_venta_usd_ars: '1390.00', fecha: '2026-03-10' };
      mockGetRateForDate.mockResolvedValue(historicalRate);
      mockCalculateBothCurrencies.mockResolvedValue({
        monto_ars: 4309000,
        monto_usd: 3100,
        tipo_cambio_usado: 1390,
      });

      const row = await strategy.generateWithDate(income, '2026-03-10', null);

      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-03-10');
      expect(mockCalculateBothCurrencies).toHaveBeenCalledWith(3100, 'USD', historicalRate);
      expect(mockIngresoUnico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ingreso_recurrente_id: 7,
          fecha: '2026-03-10',
          monto_ars: 4309000,
          monto_usd: 3100,
          tipo_cambio_usado: 1390,
        }),
        expect.anything(),
      );
      expect(income.update).toHaveBeenCalledWith({ ultima_fecha_generado: '2026-03-10' }, { transaction: null });
      expect(row).toMatchObject({ id: 99 });
    });

    it('skips creating a duplicate when an occurrence already exists for that date', async () => {
      const income = makeIngresoRecurrente();
      mockIngresoUnico.findOne.mockResolvedValue({ id: 55 });

      const row = await strategy.generateWithDate(income, '2026-03-10', null);

      expect(mockIngresoUnico.create).not.toHaveBeenCalled();
      expect(income.update).toHaveBeenCalledWith({ ultima_fecha_generado: '2026-03-10' }, { transaction: null });
      expect(row).toBeNull();
    });
  });

  describe('generateCatchUp', () => {
    it('backfills one occurrence per missed month, each with its own historical rate', async () => {
      const income = makeIngresoRecurrente({
        fecha_inicio: '2026-01-10',
        ultima_fecha_generado: null,
      });
      mockIngresoUnico.findOne.mockResolvedValue(null);

      const ratesByDate = {
        '2026-01-10': { valor_venta_usd_ars: '1300.00' },
        '2026-02-10': { valor_venta_usd_ars: '1340.00' },
        '2026-03-10': { valor_venta_usd_ars: '1390.00' },
      };
      mockGetRateForDate.mockImplementation(async (date) => ratesByDate[date]);
      mockCalculateBothCurrencies.mockImplementation(async (monto, moneda, tc) => ({
        monto_ars: monto * parseFloat(tc.valor_venta_usd_ars),
        monto_usd: monto,
        tipo_cambio_usado: parseFloat(tc.valor_venta_usd_ars),
      }));

      // Freeze "today" at March 10th — the strategy computes it via plain
      // moment().tz(...), so fake system time (not a moment.tz spy) is what
      // actually affects it.
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T12:00:00-03:00'));

      const rows = await strategy.generateCatchUp(income, null);

      jest.useRealTimers();

      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-01-10');
      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-02-10');
      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-03-10');
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.fecha)).toEqual(['2026-01-10', '2026-02-10', '2026-03-10']);
      expect(rows.map((r) => r.tipo_cambio_usado)).toEqual([1300, 1340, 1390]);
    });

    it('falls back to a single generate() for non-monthly frequencies', async () => {
      const income = makeIngresoRecurrente({ frecuencia: { nombre_frecuencia: 'anual' }, mes_de_pago: 3 });
      mockIngresoUnico.findOne.mockResolvedValue(null);
      mockGetRateForDate.mockResolvedValue({ valor_venta_usd_ars: '1390.00' });
      mockCalculateBothCurrencies.mockResolvedValue({ monto_ars: 1, monto_usd: 1, tipo_cambio_usado: 1390 });

      const generateSpy = jest.spyOn(strategy, 'generate');
      await strategy.generateCatchUp(income, null);

      expect(generateSpy).toHaveBeenCalledWith(income, null);
    });

    it('does not backfill past fecha_fin', async () => {
      const income = makeIngresoRecurrente({
        fecha_inicio: '2026-01-10',
        fecha_fin: '2026-01-20',
        ultima_fecha_generado: null,
      });
      mockIngresoUnico.findOne.mockResolvedValue(null);
      mockGetRateForDate.mockResolvedValue({ valor_venta_usd_ars: '1300.00' });
      mockCalculateBothCurrencies.mockResolvedValue({ monto_ars: 1, monto_usd: 1, tipo_cambio_usado: 1300 });

      jest.useFakeTimers().setSystemTime(new Date('2026-05-10T12:00:00-03:00'));

      const rows = await strategy.generateCatchUp(income, null);

      jest.useRealTimers();

      // Only the January occurrence (Jan 10) is on/before fecha_fin (Jan 20);
      // February's would land on Feb 10, already past fecha_fin.
      expect(rows.map((r) => r.fecha)).toEqual(['2026-01-10']);
    });
  });

  describe('clampToValidDay', () => {
    it('clamps to the last day of a shorter month', () => {
      const result = strategy.clampToValidDay(moment.tz('2026-02-01', TZ), 31);
      expect(result.format('YYYY-MM-DD')).toBe('2026-02-28');
    });

    it('keeps the exact day when valid', () => {
      const result = strategy.clampToValidDay(moment.tz('2026-03-01', TZ), 10);
      expect(result.format('YYYY-MM-DD')).toBe('2026-03-10');
    });
  });
});
