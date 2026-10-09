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

  // ─── MENSUAL: CATCH-UP ONCE THE PAYMENT DAY HAS PASSED (FLOOR, NOT A WINDOW) ──
  //
  // Regression coverage: this used to be a narrow ±2-3 day tolerance window
  // around dia_de_pago (checkDayWithTolerance), which only ever let a débito
  // catch up on its very first-ever generation (see the "never generated"
  // case below). Once it had generated at least once, any month where the
  // real bank charge day drifted more than a couple of days from the
  // configured dia_de_pago left it permanently stuck — neither the
  // scheduler nor the manual "Procesar" button (which re-validates through
  // the same check) could ever pick it up again, with no recovery short of
  // editing dia_de_pago by hand. Confirmed against real production data
  // (personal-finance-api-nodeJS, débitos "Mercadopago - Disney+" and
  // "Seguro de hogar - La segunda seguros", October 2026).
  //
  // Fixed by replacing the window with a floor: once dia_de_pago has
  // arrived or passed this month, it's due — generate regardless of how
  // many days late, relying on shouldGenerateExpense's own "already
  // generated this month" check (above) as the real duplicate guard. See
  // also scheduledGeneration.destructive.spec.ts CF-SCH-GEN-009 in
  // personal-finance-test-automation for the original "never generated"
  // E2E regression test, which this generalizes.

  describe('mensual - catch-up once the payment day has passed', () => {
    it('catches up when never generated and the payment day already passed this month', async () => {
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

    it('also catches up when it HAS already generated before, just not this month (the real-world bug)', async () => {
      const today = moment.tz('2026-04-20', TZ);
      const debit = makeDebit({
        frecuencia: 'mensual',
        dia_de_pago: 5,
        ultima_fecha_generado: '2026-03-05',
      });
      const result = await service.shouldGenerateExpense(debit, today);
      expect(result.should).toBe(true);
      expect(result.adjustedDate).toBe('2026-04-05');
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
