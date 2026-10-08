import { jest } from '@jest/globals';
import { QueryTypes } from 'sequelize';

// Mock dependencies
const mockSequelize = {
  query: jest.fn()
};

const mockGetOrCreatePreferencias = jest.fn();
const mockGetRateForDate = jest.fn();

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  sequelize: mockSequelize,
}));

jest.unstable_mockModule('../../../src/services/preferenciasUsuario.service.js', () => ({
  getOrCreatePreferencias: mockGetOrCreatePreferencias
}));

jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  ExchangeRateService: {
    getRateForDate: mockGetRateForDate
  }
}));

const {
  getEvolucionMensual,
  generarMeses,
  getLastDayOfMonth,
  round2
} = await import('../../../src/services/balance.service.js');

/**
 * Helper to set up all mocks for getEvolucionMensual.
 * The function makes these sequelize.query calls in order:
 *   1. saldo previo (Query 0)
 *   2. gastos por mes (Query 1)
 *   3. ingresos únicos por mes (Query 2)
 *
 * Recurring incomes are no longer queried/summed separately here — once
 * IngresoGeneratorService materializes each occurrence as a real
 * ingresos_unico row, they already flow through Query 0/2 above. See the
 * income-generation tests for coverage of that path.
 */
function setupMocks({
  saldoPrevio = { saldo_previo_ars: '0', saldo_previo_usd: '0' },
  gastosPorMes = [],
  ingresosUnicosPorMes = [],
} = {}) {
  mockSequelize.query
    .mockResolvedValueOnce([saldoPrevio])        // 1. saldo previo
    .mockResolvedValueOnce(gastosPorMes)         // 2. gastos
    .mockResolvedValueOnce(ingresosUnicosPorMes); // 3. ingresos únicos
}

describe('Balance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: TC available for every month
    mockGetRateForDate.mockResolvedValue({ valor_venta_usd_ars: '1350.00' });
  });

  // ==========================================
  // Pure function tests
  // ==========================================

  describe('generarMeses', () => {
    it('should generate months for a single month range', () => {
      expect(generarMeses('2026-03', '2026-03')).toEqual(['2026-03']);
    });

    it('should generate months within same year', () => {
      expect(generarMeses('2026-01', '2026-04')).toEqual([
        '2026-01', '2026-02', '2026-03', '2026-04'
      ]);
    });

    it('should generate months across year boundary', () => {
      expect(generarMeses('2025-11', '2026-02')).toEqual([
        '2025-11', '2025-12', '2026-01', '2026-02'
      ]);
    });

    it('should handle full year range', () => {
      const result = generarMeses('2026-01', '2026-12');
      expect(result).toHaveLength(12);
      expect(result[0]).toBe('2026-01');
      expect(result[11]).toBe('2026-12');
    });
  });

  describe('getLastDayOfMonth', () => {
    it('should return 31 for January', () => {
      expect(getLastDayOfMonth('2026-01')).toBe('2026-01-31');
    });

    it('should return 28 for February (non-leap year)', () => {
      expect(getLastDayOfMonth('2025-02')).toBe('2025-02-28');
    });

    it('should return 29 for February (leap year)', () => {
      expect(getLastDayOfMonth('2024-02')).toBe('2024-02-29');
    });

    it('should return 30 for April', () => {
      expect(getLastDayOfMonth('2026-04')).toBe('2026-04-30');
    });
  });

  describe('round2', () => {
    it('should round to 2 decimal places', () => {
      expect(round2(1.005)).toBe(1);
      expect(round2(1.555)).toBe(1.56);
      expect(round2(100.999)).toBe(101);
    });

    it('should handle integers', () => {
      expect(round2(100)).toBe(100);
    });

    it('should handle zero', () => {
      expect(round2(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(round2(-50.456)).toBe(-50.46);
    });
  });

  // ==========================================
  // getEvolucionMensual integration tests (with mocks)
  // ==========================================

  describe('getEvolucionMensual', () => {
    const usuarioId = 1;

    beforeEach(() => {
      mockGetOrCreatePreferencias.mockResolvedValue({
        balance_inicial: '500000'
      });
    });

    it('should return correct structure with balance_inicial', async () => {
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result).toHaveProperty('balance_inicial', 500000);
      expect(result).toHaveProperty('meses');
      expect(result).toHaveProperty('balance_actual_ars');
      expect(result).toHaveProperty('balance_actual_usd');
    });

    it('should calculate balance for a single month with gastos and ingresos', async () => {
      setupMocks({
        gastosPorMes: [{ mes: '2026-04', total_ars: '150000', total_usd: '100' }],
        ingresosUnicosPorMes: [{ mes: '2026-04', total_ars: '200000', total_usd: '150' }],
      });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.meses).toHaveLength(1);
      const mes = result.meses[0];
      expect(mes.mes).toBe('2026-04');
      expect(mes.ingresos_ars).toBe(200000);
      expect(mes.gastos_ars).toBe(150000);
      expect(mes.saldo_ars).toBe(50000);
      expect(mes.acumulado_ars).toBe(550000); // 500000 + 50000
    });

    it('should accumulate balance across months', async () => {
      setupMocks({
        gastosPorMes: [
          { mes: '2026-01', total_ars: '100000', total_usd: '0' },
          { mes: '2026-02', total_ars: '80000', total_usd: '0' }
        ],
        ingresosUnicosPorMes: [
          { mes: '2026-01', total_ars: '200000', total_usd: '0' },
          { mes: '2026-02', total_ars: '60000', total_usd: '0' }
        ],
      });

      const result = await getEvolucionMensual(usuarioId, '2026-01', '2026-02');

      expect(result.meses).toHaveLength(2);
      // Mes 1: 200k - 100k = +100k -> acumulado = 600k
      expect(result.meses[0].saldo_ars).toBe(100000);
      expect(result.meses[0].acumulado_ars).toBe(600000);
      // Mes 2: 60k - 80k = -20k -> acumulado = 580k
      expect(result.meses[1].saldo_ars).toBe(-20000);
      expect(result.meses[1].acumulado_ars).toBe(580000);

      expect(result.balance_actual_ars).toBe(580000);
    });

    it('should handle months with no data', async () => {
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-01', '2026-03');

      expect(result.meses).toHaveLength(3);
      result.meses.forEach(mes => {
        expect(mes.ingresos_ars).toBe(0);
        expect(mes.gastos_ars).toBe(0);
        expect(mes.saldo_ars).toBe(0);
        expect(mes.acumulado_ars).toBe(500000);
      });
    });

    // Recurring-income-specific scenarios ("should include recurring income
    // in calculations", "should respect fecha_inicio/fecha_fin of recurring
    // income", "should include recurring income from months before the
    // range in saldo previo") used to live here, asserting that the
    // recurring *template* got summed directly every month. That was
    // exactly the bug described in docs/architecture/known-issues.md
    // ("Ingresos recurrentes en USD..."): it ignored each month's own
    // exchange rate. Fixed by removing that summation entirely — recurring
    // incomes now flow through ingresosUnicosPorMes like any other ingreso
    // único, via IngresoGeneratorService (see
    // tests/unit/strategies/recurringIncomeStrategy.test.js and
    // tests/unit/services/ingresoRecurrente.service.test.js for coverage
    // of that generation path).

    it('should handle balance_inicial = 0', async () => {
      mockGetOrCreatePreferencias.mockResolvedValue({ balance_inicial: '0' });
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.balance_inicial).toBe(0);
      expect(result.meses[0].acumulado_ars).toBe(0);
    });

    it('should handle negative saldo (deficit)', async () => {
      mockGetOrCreatePreferencias.mockResolvedValue({ balance_inicial: '100000' });
      setupMocks({
        gastosPorMes: [{ mes: '2026-04', total_ars: '200000', total_usd: '0' }],
        ingresosUnicosPorMes: [{ mes: '2026-04', total_ars: '50000', total_usd: '0' }],
      });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.meses[0].saldo_ars).toBe(-150000);
      expect(result.meses[0].acumulado_ars).toBe(-50000); // 100k - 150k
    });

    it('should include saldo previo from months before the range', async () => {
      setupMocks({
        saldoPrevio: { saldo_previo_ars: '200000', saldo_previo_usd: '100' },
      });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      // acumulado = balance_inicial(500k) + saldo_previo(200k) + saldo_mes(0) = 700k
      expect(result.meses[0].acumulado_ars).toBe(700000);
      expect(result.meses[0].acumulado_usd).toBe(100);
    });

    // ─── tipo_cambio_mes ────────────────────────────────────────────────────────

    it('should include tipo_cambio_mes from ExchangeRateService in each month', async () => {
      mockGetRateForDate.mockResolvedValue({ valor_venta_usd_ars: '1350.50' });
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.meses[0].tipo_cambio_mes).toBe(1350.50);
      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-04-30');
    });

    it('should use last day of each month when fetching TC', async () => {
      mockGetRateForDate
        .mockResolvedValueOnce({ valor_venta_usd_ars: '1300.00' }) // Jan
        .mockResolvedValueOnce({ valor_venta_usd_ars: '1400.00' }); // Feb
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-01', '2026-02');

      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-01-31');
      expect(mockGetRateForDate).toHaveBeenCalledWith('2026-02-28');
      expect(result.meses[0].tipo_cambio_mes).toBe(1300);
      expect(result.meses[1].tipo_cambio_mes).toBe(1400);
    });

    it('should set tipo_cambio_mes to null when ExchangeRateService throws', async () => {
      mockGetRateForDate.mockRejectedValue(new Error('No TC found'));
      setupMocks();

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.meses[0].tipo_cambio_mes).toBeNull();
    });

    it('should not affect ARS balance calculations when TC is unavailable', async () => {
      mockGetRateForDate.mockRejectedValue(new Error('No TC found'));
      setupMocks({
        gastosPorMes: [{ mes: '2026-04', total_ars: '100000', total_usd: '0' }],
        ingresosUnicosPorMes: [{ mes: '2026-04', total_ars: '150000', total_usd: '0' }],
      });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      // ARS balance unaffected
      expect(result.meses[0].saldo_ars).toBe(50000);
      expect(result.meses[0].acumulado_ars).toBe(550000);
      expect(result.meses[0].tipo_cambio_mes).toBeNull();
    });
  });
});
