import { jest } from '@jest/globals';
import moment from 'moment-timezone';

// Mock all model dependencies
jest.unstable_mockModule('../../../src/models/index.js', () => ({
  GastoRecurrente: {},
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {},
}));

jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  default: { getLatestRate: jest.fn() },
}));

const { GastoRecurrenteService } = await import('../../../src/services/gastoRecurrente.service.js');

const service = new GastoRecurrenteService();
const TZ = 'America/Argentina/Buenos_Aires';

function makeExpense({ frecuencia, dia_de_pago, mes_de_pago = null, ultima_fecha_generado = null, fecha_inicio = null } = {}) {
  return {
    dia_de_pago,
    mes_de_pago,
    ultima_fecha_generado,
    fecha_inicio,
    frecuencia: { nombre_frecuencia: frecuencia },
  };
}

describe('GastoRecurrenteService - frequency checks', () => {

  // ─── TRIMESTRAL ────────────────────────────────────────────────────────────

  describe('checkQuarterlyFrequency', () => {
    it('generates on first time (no ultima_fecha_generado)', () => {
      const today = moment.tz('2026-05-15', TZ);
      const expense = makeExpense({ frecuencia: 'trimestral', dia_de_pago: 15 });
      const result = service.checkQuarterlyFrequency(expense, today, 15, 5);
      expect(result.matches).toBe(true);
      expect(result.reason).toMatch(/First quarterly/);
    });

    it('does not generate if only 2 months since last generation', () => {
      const today = moment.tz('2026-05-15', TZ);
      const expense = makeExpense({ frecuencia: 'trimestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkQuarterlyFrequency(expense, today, 15, 5);
      expect(result.matches).toBe(false);
      expect(result.reason).toMatch(/only 2 months/);
    });

    it('generates after 3 months', () => {
      const today = moment.tz('2026-06-15', TZ);
      const expense = makeExpense({ frecuencia: 'trimestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkQuarterlyFrequency(expense, today, 15, 6);
      expect(result.matches).toBe(true);
    });

    it('does not generate on wrong day', () => {
      const today = moment.tz('2026-06-10', TZ);
      const expense = makeExpense({ frecuencia: 'trimestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkQuarterlyFrequency(expense, today, 10, 6);
      expect(result.matches).toBe(false);
      expect(result.reason).toMatch(/wrong day/);
    });

    it('respects any start month, not just hardcoded 1/4/7/10', () => {
      // Created in Feb, first generation should be in Feb, next in May — not locked to Jan/Apr/Jul/Oct
      const today = moment.tz('2026-02-15', TZ);
      const expense = makeExpense({ frecuencia: 'trimestral', dia_de_pago: 15 }); // no ultima_fecha_generado
      const result = service.checkQuarterlyFrequency(expense, today, 15, 2);
      expect(result.matches).toBe(true); // Feb is valid because it's the first generation
    });
  });

  // ─── SEMESTRAL ─────────────────────────────────────────────────────────────

  describe('checkSemiannualFrequency', () => {
    it('generates on first time (no ultima_fecha_generado)', () => {
      const today = moment.tz('2026-03-15', TZ);
      const expense = makeExpense({ frecuencia: 'semestral', dia_de_pago: 15 });
      const result = service.checkSemiannualFrequency(expense, today, 15, 3);
      expect(result.matches).toBe(true);
      expect(result.reason).toMatch(/First semiannual/);
    });

    it('does not generate if only 5 months since last generation', () => {
      const today = moment.tz('2026-08-15', TZ);
      const expense = makeExpense({ frecuencia: 'semestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkSemiannualFrequency(expense, today, 15, 8);
      expect(result.matches).toBe(false);
      expect(result.reason).toMatch(/only 5 months/);
    });

    it('generates after 6 months', () => {
      const today = moment.tz('2026-09-15', TZ);
      const expense = makeExpense({ frecuencia: 'semestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkSemiannualFrequency(expense, today, 15, 9);
      expect(result.matches).toBe(true);
    });

    it('respects any start month, not just hardcoded 1/7', () => {
      // Created in March — should generate in March (first time), not forced to wait for January
      const today = moment.tz('2026-03-15', TZ);
      const expense = makeExpense({ frecuencia: 'semestral', dia_de_pago: 15 });
      const result = service.checkSemiannualFrequency(expense, today, 15, 3);
      expect(result.matches).toBe(true);
    });

    it('does not generate on wrong day', () => {
      const today = moment.tz('2026-09-10', TZ);
      const expense = makeExpense({ frecuencia: 'semestral', dia_de_pago: 15, ultima_fecha_generado: '2026-03-15' });
      const result = service.checkSemiannualFrequency(expense, today, 10, 9);
      expect(result.matches).toBe(false);
    });
  });

  // ─── ANUAL ─────────────────────────────────────────────────────────────────

  describe('checkAnnualFrequency', () => {
    it('generates on correct month and day', () => {
      const today = moment.tz('2026-04-15', TZ);
      const expense = makeExpense({ frecuencia: 'anual', dia_de_pago: 15, mes_de_pago: 4 });
      const result = service.checkAnnualFrequency(expense, today, 15, 4);
      expect(result.matches).toBe(true);
    });

    it('does not generate on wrong month', () => {
      const today = moment.tz('2026-05-15', TZ);
      const expense = makeExpense({ frecuencia: 'anual', dia_de_pago: 15, mes_de_pago: 4 });
      const result = service.checkAnnualFrequency(expense, today, 15, 5);
      expect(result.matches).toBe(false);
    });

    it('requires mes_de_pago to be set', () => {
      const today = moment.tz('2026-04-15', TZ);
      const expense = makeExpense({ frecuencia: 'anual', dia_de_pago: 15, mes_de_pago: null });
      const result = service.checkAnnualFrequency(expense, today, 15, 4);
      expect(result.matches).toBe(false);
      expect(result.reason).toMatch(/mes_de_pago/);
    });
  });

  // ─── DUPLICATE PREVENTION in shouldGenerateExpense ─────────────────────────

  describe('shouldGenerateExpense - duplicate prevention', () => {
    it('trimestral: blocks if generated 2 months ago', async () => {
      const today = moment.tz('2026-05-15', TZ);
      const expense = makeExpense({
        frecuencia: 'trimestral',
        dia_de_pago: 15,
        ultima_fecha_generado: '2026-03-15',
        fecha_inicio: '2026-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toMatch(/2 months ago/);
    });

    it('trimestral: allows if generated 3 months ago', async () => {
      const today = moment.tz('2026-06-15', TZ);
      const expense = makeExpense({
        frecuencia: 'trimestral',
        dia_de_pago: 15,
        ultima_fecha_generado: '2026-03-15',
        fecha_inicio: '2026-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(true);
    });

    it('semestral: blocks if generated 5 months ago', async () => {
      const today = moment.tz('2026-08-15', TZ);
      const expense = makeExpense({
        frecuencia: 'semestral',
        dia_de_pago: 15,
        ultima_fecha_generado: '2026-03-15',
        fecha_inicio: '2026-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toMatch(/5 months ago/);
    });

    it('semestral: allows if generated 6 months ago', async () => {
      const today = moment.tz('2026-09-15', TZ);
      const expense = makeExpense({
        frecuencia: 'semestral',
        dia_de_pago: 15,
        ultima_fecha_generado: '2026-03-15',
        fecha_inicio: '2026-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(true);
    });

    it('anual: blocks if already generated this year', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const expense = makeExpense({
        frecuencia: 'anual',
        dia_de_pago: 15,
        mes_de_pago: 4,
        ultima_fecha_generado: '2026-04-15',
        fecha_inicio: '2025-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toMatch(/Already generated this year/);
    });

    it('anual: allows if last generated previous year', async () => {
      const today = moment.tz('2026-04-15', TZ);
      const expense = makeExpense({
        frecuencia: 'anual',
        dia_de_pago: 15,
        mes_de_pago: 4,
        ultima_fecha_generado: '2025-04-15',
        fecha_inicio: '2025-01-01',
      });
      const result = await service.shouldGenerateExpense(expense, today);
      expect(result.canGenerate).toBe(true);
    });
  });
});
