import { jest } from '@jest/globals';
import moment from 'moment-timezone';

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  DebitoAutomatico: {},
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {},
  Op: {},
}));

jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  default: { getLatestRate: jest.fn() },
}));

const { DebitoAutomaticoService } = await import('../../../src/services/debitoAutomatico.service.js');

const service = new DebitoAutomaticoService();
const TZ = 'America/Argentina/Buenos_Aires';

function makeDebit({ frecuencia, dia_de_pago, mes_de_pago = null, ultima_fecha_generado = null, fecha_inicio = '2026-01-01', fecha_fin = null } = {}) {
  return {
    dia_de_pago,
    mes_de_pago,
    ultima_fecha_generado,
    fecha_inicio,
    fecha_fin,
    activo: true,
    frecuencia: { nombre_frecuencia: frecuencia },
  };
}

describe('DebitoAutomaticoService - duplicate prevention for long-period frequencies', () => {

  // ─── TRIMESTRAL ────────────────────────────────────────────────────────────

  describe('trimestral', () => {
    it('blocks generation if already generated 2 months ago', async () => {
      const today = moment.tz('2026-05-15', TZ);
      const debit = makeDebit({
        frecuencia: 'trimestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-01-15',
        ultima_fecha_generado: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
      expect(result.reason).toMatch(/2 months ago/);
    });

    it('allows generation after 3 months', async () => {
      const today = moment.tz('2026-06-15', TZ);
      const debit = makeDebit({
        frecuencia: 'trimestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-03-15',
        ultima_fecha_generado: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });

    it('allows first generation (no ultima_fecha_generado)', async () => {
      const today = moment.tz('2026-03-15', TZ);
      const debit = makeDebit({
        frecuencia: 'trimestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });
  });

  // ─── SEMESTRAL ─────────────────────────────────────────────────────────────

  describe('semestral', () => {
    it('blocks generation if already generated 5 months ago', async () => {
      const today = moment.tz('2026-08-15', TZ);
      const debit = makeDebit({
        frecuencia: 'semestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-03-15',
        ultima_fecha_generado: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
      expect(result.reason).toMatch(/5 months ago/);
    });

    it('allows generation after 6 months', async () => {
      const today = moment.tz('2026-09-15', TZ);
      const debit = makeDebit({
        frecuencia: 'semestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-03-15',
        ultima_fecha_generado: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });

    it('allows first generation (no ultima_fecha_generado)', async () => {
      const today = moment.tz('2026-03-15', TZ);
      const debit = makeDebit({
        frecuencia: 'semestral',
        dia_de_pago: 15,
        fecha_inicio: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });
  });

  // ─── ANUAL ─────────────────────────────────────────────────────────────────

  describe('anual', () => {
    it('blocks generation if already generated this year', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const debit = makeDebit({
        frecuencia: 'anual',
        dia_de_pago: 10,
        mes_de_pago: 1,
        fecha_inicio: '2026-01-10',
        ultima_fecha_generado: '2026-01-10',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
      expect(result.reason).toMatch(/Already generated this year/);
    });

    it('allows generation in a new year', async () => {
      const today = moment.tz('2027-01-10', TZ);
      const debit = makeDebit({
        frecuencia: 'anual',
        dia_de_pago: 10,
        mes_de_pago: 1,
        fecha_inicio: '2026-01-10',
        ultima_fecha_generado: '2026-01-10',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });

    it('allows first generation (no ultima_fecha_generado)', async () => {
      const today = moment.tz('2026-01-10', TZ);
      const debit = makeDebit({
        frecuencia: 'anual',
        dia_de_pago: 10,
        mes_de_pago: 1,
        fecha_inicio: '2026-01-10',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });
  });

  // ─── EXISTING FREQUENCIES UNAFFECTED ──────────────────────────────────────

  describe('mensual - existing behavior unchanged', () => {
    it('blocks if already generated this month', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 15,
        fecha_inicio: '2026-01-15',
        ultima_fecha_generado: '2026-04-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
    });

    it('allows if last generated previous month', async () => {
      const today = moment.tz('2026-04-15', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 15,
        fecha_inicio: '2026-01-15',
        ultima_fecha_generado: '2026-03-15',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
    });
  });

  // ─── MENSUAL: CATCH-UP FOR NEVER-GENERATED, DAY ALREADY PASSED ────────────
  //
  // Regression coverage: unlike GastoRecurrenteService, this service had no
  // catch-up branch for a débito created after its payment day had already
  // passed this month — it would silently wait for next month's payment day
  // instead of generating immediately. See scheduledGeneration.destructive.spec.ts
  // CF-SCH-GEN-009 in personal-finance-test-automation for the E2E regression test.

  describe('mensual - catch-up for never-generated, day already passed', () => {
    it('catches up when never generated and the payment day already passed this month, well beyond tolerance', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 5,
        ultima_fecha_generado: null,
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
      expect(result.adjustedDate).toBe('2026-04-05');
    });

    it('does not catch up once it has already been generated at least once', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 5,
        ultima_fecha_generado: '2026-03-05',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
    });

    it('does not generate when the payment day has not arrived yet this month', async () => {
      const today = moment.tz('2026-04-10', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 20,
        ultima_fecha_generado: null,
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(false);
    });

    it('is an exact match (not catch-up) on the last day of a shorter month when the configured day does not exist (e.g. 31 in a 30-day month)', async () => {
      // validDay clamps to the month's last day, which is also the highest
      // possible value for today.date() within that month — so "today past
      // the clamped day" can never happen; the day it does exist can only
      // ever be an exact match.
      const today = moment.tz('2026-04-30', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 31,
        ultima_fecha_generado: null,
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
      expect(result.adjustedDate).toBe('2026-04-30');
    });
  });
});
