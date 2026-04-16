import { jest } from '@jest/globals';
import moment from 'moment-timezone';

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  GastoRecurrente: {},
  DebitoAutomatico: {},
  Compra: {},
  Gasto: {},
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {},
}));

const { ProyeccionService } = await import('../../../src/services/proyeccion.service.js');

const TZ = 'America/Argentina/Buenos_Aires';

function expense({ dia_de_pago, mes_de_pago = null, fecha_inicio }) {
  return { dia_de_pago, mes_de_pago, fecha_inicio };
}

function month(str) {
  return moment.tz(str, TZ).startOf('month');
}

describe('ProyeccionService.willGenerateInMonth', () => {

  // ─── TRIMESTRAL ────────────────────────────────────────────────────────────

  describe('trimestral', () => {
    it('generates on the start month (monthsSince = 0)', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-03-01')).generates).toBe(true);
    });

    it('generates 3 months after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-06-01')).generates).toBe(true);
    });

    it('generates 6 months after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-09-01')).generates).toBe(true);
    });

    it('does NOT generate 1 month after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-04-01')).generates).toBe(false);
    });

    it('does NOT generate 2 months after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-05-01')).generates).toBe(false);
    });

    it('does NOT generate before start date', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-01-01')).generates).toBe(false);
    });

    it('does NOT generate without fecha_inicio', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: null });
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-04-01')).generates).toBe(false);
    });

    it('works for Feb start crossing year boundary', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2025-11-01' });
      // Nov 2025 → Feb 2026 = 3 months → should generate
      expect(ProyeccionService.willGenerateInMonth(e, 'trimestral', month('2026-02-01')).generates).toBe(true);
    });
  });

  // ─── SEMESTRAL ─────────────────────────────────────────────────────────────

  describe('semestral', () => {
    it('generates on the start month', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'semestral', month('2026-03-01')).generates).toBe(true);
    });

    it('generates 6 months after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'semestral', month('2026-09-01')).generates).toBe(true);
    });

    it('does NOT generate 3 months after start', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-03-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'semestral', month('2026-06-01')).generates).toBe(false);
    });

    it('does NOT generate without fecha_inicio', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: null });
      expect(ProyeccionService.willGenerateInMonth(e, 'semestral', month('2026-07-01')).generates).toBe(false);
    });
  });

  // ─── BIMESTRAL ─────────────────────────────────────────────────────────────

  describe('bimestral', () => {
    it('generates on start month', () => {
      const e = expense({ dia_de_pago: 10, fecha_inicio: '2026-02-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'bimestral', month('2026-02-01')).generates).toBe(true);
    });

    it('generates 2 months after start', () => {
      const e = expense({ dia_de_pago: 10, fecha_inicio: '2026-02-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'bimestral', month('2026-04-01')).generates).toBe(true);
    });

    it('does NOT generate 1 month after start', () => {
      const e = expense({ dia_de_pago: 10, fecha_inicio: '2026-02-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'bimestral', month('2026-03-01')).generates).toBe(false);
    });

    it('works crossing year boundary (Nov start → Jan next year)', () => {
      const e = expense({ dia_de_pago: 10, fecha_inicio: '2025-11-01' });
      // Nov → Jan = 2 months → should generate
      expect(ProyeccionService.willGenerateInMonth(e, 'bimestral', month('2026-01-01')).generates).toBe(true);
    });
  });

  // ─── ANUAL ─────────────────────────────────────────────────────────────────

  describe('anual', () => {
    it('generates on correct month', () => {
      const e = expense({ dia_de_pago: 10, mes_de_pago: 4, fecha_inicio: '2026-04-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'anual', month('2026-04-01')).generates).toBe(true);
    });

    it('does NOT generate on wrong month', () => {
      const e = expense({ dia_de_pago: 10, mes_de_pago: 4, fecha_inicio: '2026-04-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'anual', month('2026-05-01')).generates).toBe(false);
    });

    it('generates same month next year', () => {
      const e = expense({ dia_de_pago: 10, mes_de_pago: 4, fecha_inicio: '2026-04-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'anual', month('2027-04-01')).generates).toBe(true);
    });
  });

  // ─── MENSUAL (regression) ──────────────────────────────────────────────────

  describe('mensual', () => {
    it('generates every month', () => {
      const e = expense({ dia_de_pago: 15, fecha_inicio: '2026-01-01' });
      expect(ProyeccionService.willGenerateInMonth(e, 'mensual', month('2026-03-01')).generates).toBe(true);
      expect(ProyeccionService.willGenerateInMonth(e, 'mensual', month('2026-07-01')).generates).toBe(true);
    });
  });
});
