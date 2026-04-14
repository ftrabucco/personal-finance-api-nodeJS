import { jest } from '@jest/globals';
import { QueryTypes } from 'sequelize';

// Mock dependencies
const mockSequelize = {
  query: jest.fn()
};

const mockIngresoRecurrente = {
  findAll: jest.fn()
};

const mockGetOrCreatePreferencias = jest.fn();

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  sequelize: mockSequelize,
  IngresoRecurrente: mockIngresoRecurrente,
}));

jest.unstable_mockModule('../../../src/services/preferenciasUsuario.service.js', () => ({
  getOrCreatePreferencias: mockGetOrCreatePreferencias
}));

const {
  getEvolucionMensual,
  generarMeses,
  getLastDayOfMonth,
  round2
} = await import('../../../src/services/balance.service.js');

/**
 * Helper to set up all mocks for getEvolucionMensual.
 * The function now makes these calls in order:
 *   1. getOrCreatePreferencias (set in beforeEach)
 *   2. sequelize.query — saldo previo (Query 0)
 *   3. sequelize.query — gastos por mes
 *   4. sequelize.query — ingresos únicos por mes
 *   5. IngresoRecurrente.findAll — recurrentes for main calculation
 *   6. IngresoRecurrente.findAll — recurrentes for calcularIngresosRecurrentesPrevios
 *   7. sequelize.query — oldest date (inside calcularIngresosRecurrentesPrevios)
 */
function setupMocks({
  saldoPrevio = { saldo_previo_ars: '0', saldo_previo_usd: '0' },
  gastosPorMes = [],
  ingresosUnicosPorMes = [],
  recurrentes = [],
  oldestDate = null,
} = {}) {
  // Call order in getEvolucionMensual:
  //   1. sequelize.query — saldo previo (Query 0)
  //   2. calcularIngresosRecurrentesPrevios:
  //      2a. IngresoRecurrente.findAll (1st findAll)
  //      2b. sequelize.query — oldest date (ONLY if recurrentes.length > 0)
  //   3. sequelize.query — gastos
  //   4. sequelize.query — ingresos únicos
  //   5. IngresoRecurrente.findAll — main recurrentes (2nd findAll)
  const queryChain = mockSequelize.query
    .mockResolvedValueOnce([saldoPrevio]);              // 1. saldo previo

  if (recurrentes.length > 0) {
    queryChain.mockResolvedValueOnce([{ min_fecha: oldestDate }]); // 2b. oldest date
  }

  queryChain
    .mockResolvedValueOnce(gastosPorMes)                // 3. gastos
    .mockResolvedValueOnce(ingresosUnicosPorMes);       // 4. ingresos únicos

  mockIngresoRecurrente.findAll
    .mockResolvedValueOnce(recurrentes)  // 2a. calcularIngresosRecurrentesPrevios
    .mockResolvedValueOnce(recurrentes); // 5. main recurrentes
}

describe('Balance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should include recurring income in calculations', async () => {
      const recurrentes = [
        {
          monto_ars: '100000',
          monto_usd: '80',
          activo: true,
          fecha_inicio: null,
          fecha_fin: null
        }
      ];
      setupMocks({ recurrentes });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      expect(result.meses[0].ingresos_ars).toBe(100000);
      expect(result.meses[0].acumulado_ars).toBe(600000);
    });

    it('should respect fecha_inicio and fecha_fin of recurring income', async () => {
      const recurrentes = [
        {
          monto_ars: '100000',
          monto_usd: '0',
          activo: true,
          fecha_inicio: '2026-02-01',
          fecha_fin: '2026-02-28'
        }
      ];
      setupMocks({ recurrentes });

      const result = await getEvolucionMensual(usuarioId, '2026-01', '2026-03');

      // Only February should have the recurring income
      expect(result.meses[0].ingresos_ars).toBe(0);     // Jan
      expect(result.meses[1].ingresos_ars).toBe(100000); // Feb
      expect(result.meses[2].ingresos_ars).toBe(0);     // Mar
    });

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

    it('should include recurring income from months before the range in saldo previo', async () => {
      const recurrentes = [
        {
          monto_ars: '50000',
          monto_usd: '0',
          activo: true,
          fecha_inicio: null,
          fecha_fin: null
        }
      ];
      // Oldest date is 3 months before the range start
      setupMocks({
        recurrentes,
        oldestDate: '2026-01-15',
      });

      const result = await getEvolucionMensual(usuarioId, '2026-04', '2026-04');

      // Recurring income of 50k for Jan, Feb, Mar (3 months before Apr) = 150k previo
      // Plus 50k recurring in April itself
      // acumulado = 500k + 150k (saldo previo recurrentes) + 50k (recurrente in Apr) = 700k
      expect(result.meses[0].acumulado_ars).toBe(700000);
    });
  });
});
