import { jest } from '@jest/globals';
import moment from 'moment-timezone';

// Mock all model dependencies — mirrors gastoRecurrente.frequency.test.js
jest.unstable_mockModule('../../../src/models/index.js', () => ({
  IngresoRecurrente: {},
  FuenteIngreso: {},
  FrecuenciaGasto: {},
}));

jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  default: { calculateBothCurrencies: jest.fn() },
}));

const { IngresoRecurrenteService } = await import('../../../src/services/ingresoRecurrente.service.js');

const service = new IngresoRecurrenteService();
const TZ = 'America/Argentina/Buenos_Aires';

function makeIncome({ frecuencia, dia_de_pago, mes_de_pago = null, ultima_fecha_generado = null, fecha_inicio = null, fecha_fin = null } = {}) {
  return {
    dia_de_pago,
    mes_de_pago,
    ultima_fecha_generado,
    fecha_inicio,
    fecha_fin,
    frecuencia: { nombre_frecuencia: frecuencia },
  };
}

describe('IngresoRecurrenteService - shouldGenerateIncome', () => {
  // ─── MENSUAL (the motivating case: a monthly salary) ────────────────────

  it('generates on first time when today matches dia_de_pago', async () => {
    const today = moment.tz('2026-05-10', TZ);
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 10, fecha_inicio: '2026-01-01' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(true);
    expect(result.adjustedDate).toBe('2026-05-10');
  });

  it('does not generate on a day other than dia_de_pago with no tolerance window yet', async () => {
    const today = moment.tz('2026-05-08', TZ);
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 10, ultima_fecha_generado: '2026-04-10' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(false);
  });

  it('does not generate twice in the same month', async () => {
    const today = moment.tz('2026-05-10', TZ);
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 10, ultima_fecha_generado: '2026-05-10' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(false);
    expect(result.reason).toMatch(/already generated this month/i);
  });

  it('clamps dia_de_pago to the last valid day of a shorter month', async () => {
    const today = moment.tz('2026-02-28', TZ); // 2026 is not a leap year
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 31, ultima_fecha_generado: '2026-01-31' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(true);
    expect(result.adjustedDate).toBe('2026-02-28');
  });

  it('respects fecha_inicio — does not generate before it', async () => {
    const today = moment.tz('2026-05-10', TZ);
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 10, fecha_inicio: '2026-06-01' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(false);
    expect(result.reason).toMatch(/start date/i);
  });

  it('respects fecha_fin — does not generate after it', async () => {
    const today = moment.tz('2026-05-10', TZ);
    const income = makeIncome({ frecuencia: 'mensual', dia_de_pago: 10, fecha_fin: '2026-04-30', ultima_fecha_generado: '2026-04-10' });
    const result = await service.shouldGenerateIncome(income, today);
    expect(result.canGenerate).toBe(false);
    expect(result.reason).toMatch(/end date/i);
  });

  // ─── QUINCENAL ────────────────────────────────────────────────────────────

  describe('checkBiweeklyFrequency', () => {
    it('generates on the 1st or 15th', () => {
      const today = moment.tz('2026-05-15', TZ);
      const income = makeIncome({ frecuencia: 'quincenal', dia_de_pago: 15 });
      const result = service.checkBiweeklyFrequency(income, today, 15);
      expect(result.matches).toBe(true);
    });

    it('does not generate on any other day', () => {
      const today = moment.tz('2026-05-10', TZ);
      const income = makeIncome({ frecuencia: 'quincenal', dia_de_pago: 15, ultima_fecha_generado: '2026-05-01' });
      const result = service.checkBiweeklyFrequency(income, today, 10);
      expect(result.matches).toBe(false);
    });
  });

  // ─── ANUAL ────────────────────────────────────────────────────────────────

  describe('checkAnnualFrequency', () => {
    it('requires mes_de_pago to be set', () => {
      const today = moment.tz('2026-12-10', TZ);
      const income = makeIncome({ frecuencia: 'anual', dia_de_pago: 10 });
      const result = service.checkAnnualFrequency(income, today, 10, 12);
      expect(result.matches).toBe(false);
      expect(result.reason).toMatch(/requires mes_de_pago/);
    });

    it('generates on the exact month and day', () => {
      const today = moment.tz('2026-12-10', TZ);
      const income = makeIncome({ frecuencia: 'anual', dia_de_pago: 10, mes_de_pago: 12 });
      const result = service.checkAnnualFrequency(income, today, 10, 12);
      expect(result.matches).toBe(true);
    });

    it('does not generate in the wrong month', () => {
      const today = moment.tz('2026-11-10', TZ);
      const income = makeIncome({ frecuencia: 'anual', dia_de_pago: 10, mes_de_pago: 12 });
      const result = service.checkAnnualFrequency(income, today, 10, 11);
      expect(result.matches).toBe(false);
    });
  });

  // ─── Unknown / one-time frequency ────────────────────────────────────────

  it('never generates for the "único" frequency', () => {
    const today = moment.tz('2026-05-10', TZ);
    const income = makeIncome({ frecuencia: 'unico', dia_de_pago: 10 });
    const result = service.checkFrequencyMatch(income, today, income.frecuencia);
    expect(result.matches).toBe(false);
  });
});
