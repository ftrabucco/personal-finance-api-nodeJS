import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock sequelize
const mockTransaction = {
  commit: jest.fn().mockResolvedValue(),
  rollback: jest.fn().mockResolvedValue()
};

jest.unstable_mockModule('../../../src/db/postgres.js', () => ({
  default: {
    transaction: jest.fn().mockResolvedValue(mockTransaction)
  }
}));

// Mock logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Gasto.create
const mockGastoCreate = jest.fn();

// Mock models
const mockCompraCreate = jest.fn();
const mockCompraFindByPk = jest.fn();
const mockCompraUpdate = jest.fn();

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Compra: {
    create: mockCompraCreate,
    findByPk: mockCompraFindByPk,
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn()
  },
  CategoriaGasto: { findByPk: jest.fn().mockResolvedValue({ id: 1 }) },
  ImportanciaGasto: { findByPk: jest.fn().mockResolvedValue({ id: 1 }) },
  TipoPago: { findByPk: jest.fn().mockResolvedValue({ id: 1 }) },
  Tarjeta: { findByPk: jest.fn().mockResolvedValue({ id: 1, tipo: 'credito', dia_mes_cierre: 20, dia_mes_vencimiento: 10 }) },
  Gasto: {
    create: mockGastoCreate,
    findAll: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0)
  }
}));

// Mock GastoGeneratorService
const mockGenerateFromCompra = jest.fn();
jest.unstable_mockModule('../../../src/services/gastoGenerator.service.js', () => ({
  GastoGeneratorService: {
    generateFromCompra: mockGenerateFromCompra
  }
}));

// Mock ExchangeRateService
jest.unstable_mockModule('../../../src/services/exchangeRate.service.js', () => ({
  ExchangeRateService: {
    calculateBothCurrencies: jest.fn().mockResolvedValue({
      monto_ars: 12000,
      monto_usd: 12,
      tipo_cambio_usado: 1000
    })
  }
}));

// Mock responseHelper
const mockSendSuccess = jest.fn();
const mockSendError = jest.fn();
const mockSendValidationError = jest.fn();
jest.unstable_mockModule('../../../src/utils/responseHelper.js', () => ({
  sendError: mockSendError,
  sendSuccess: mockSendSuccess,
  sendPaginatedSuccess: jest.fn(),
  sendValidationError: mockSendValidationError
}));

// Mock filterBuilder
jest.unstable_mockModule('../../../src/utils/filterBuilder.js', () => ({
  FilterBuilder: class { },
  buildQueryOptions: jest.fn(),
  buildPagination: jest.fn()
}));

// Mock formDataHelper
jest.unstable_mockModule('../../../src/utils/formDataHelper.js', () => ({
  cleanEntityFormData: jest.fn((data) => data)
}));

// Mock base controller validateExistingIds
jest.unstable_mockModule('../../../src/controllers/api/base.controller.js', () => ({
  BaseController: class {
    constructor(model, name) {
      this.model = model;
      this.modelName = name;
    }
    async validateExistingIds() { return []; }
  }
}));

let CompraController;
let InstallmentExpenseStrategy;

beforeEach(async () => {
  jest.clearAllMocks();
  const module = await import('../../../src/controllers/api/compra.controller.js');
  CompraController = module.CompraController;
  const strategyModule = await import('../../../src/strategies/expenseGeneration/installmentStrategy.js');
  InstallmentExpenseStrategy = strategyModule.InstallmentExpenseStrategy;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CompraController - cuotas_pagadas', () => {
  describe('validateCompraFields', () => {
    let controller;

    beforeEach(() => {
      controller = new CompraController();
    });

    it('should pass validation when cuotas_pagadas is 0', () => {
      const result = controller.validateCompraFields({
        monto_total: 12000,
        fecha_compra: '2025-12-15',
        cantidad_cuotas: 12,
        cuotas_pagadas: 0
      });
      expect(result.isValid).toBe(true);
    });

    it('should pass validation when cuotas_pagadas < cantidad_cuotas', () => {
      const result = controller.validateCompraFields({
        monto_total: 12000,
        fecha_compra: '2025-12-15',
        cantidad_cuotas: 12,
        cuotas_pagadas: 5
      });
      expect(result.isValid).toBe(true);
    });

    it('should pass validation when cuotas_pagadas equals cantidad_cuotas', () => {
      const result = controller.validateCompraFields({
        monto_total: 6000,
        fecha_compra: '2025-10-15',
        cantidad_cuotas: 6,
        cuotas_pagadas: 6
      });
      expect(result.isValid).toBe(true);
    });

    it('should fail validation when cuotas_pagadas > cantidad_cuotas', () => {
      const result = controller.validateCompraFields({
        monto_total: 6000,
        fecha_compra: '2025-10-15',
        cantidad_cuotas: 6,
        cuotas_pagadas: 7
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('cuotas pagadas no pueden superar');
    });

    it('should fail when cuotas_pagadas > 1 and cantidad_cuotas defaults to 1', () => {
      const result = controller.validateCompraFields({
        monto_total: 1000,
        fecha_compra: '2025-12-15',
        cuotas_pagadas: 2
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('generateHistoricalInstallments', () => {
    let strategy;

    beforeEach(() => {
      strategy = new InstallmentExpenseStrategy();
      mockGastoCreate.mockImplementation((data) => Promise.resolve({ id: Math.random(), ...data }));
    });

    it('should generate gastos with monthly dates for non-credit-card purchases', async () => {
      const compra = {
        id: 1,
        descripcion: 'Laptop',
        monto_total: 6000,
        monto_total_ars: 6000,
        monto_total_usd: null,
        cantidad_cuotas: 6,
        fecha_compra: '2025-12-15',
        moneda_origen: 'ARS',
        tipo_cambio_usado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 2,
        tarjeta_id: null,
        tarjeta: null,
        usuario_id: 1
      };

      const result = await strategy.generateHistoricalInstallments(compra, 3, mockTransaction);

      expect(result.gastos).toHaveLength(3);
      expect(mockGastoCreate).toHaveBeenCalledTimes(3);

      // Verify dates: Dec 15, Jan 15, Feb 15
      const calls = mockGastoCreate.mock.calls;
      expect(calls[0][0].fecha).toBe('2025-12-15');
      expect(calls[1][0].fecha).toBe('2026-01-15');
      expect(calls[2][0].fecha).toBe('2026-02-15');

      // Verify descriptions
      expect(calls[0][0].descripcion).toBe('Laptop - Cuota 1/6');
      expect(calls[1][0].descripcion).toBe('Laptop - Cuota 2/6');
      expect(calls[2][0].descripcion).toBe('Laptop - Cuota 3/6');

      // Verify amounts (6000 / 6 = 1000)
      expect(calls[0][0].monto_ars).toBe(1000);
      expect(calls[0][0].monto_usd).toBeNull();

      // Verify tipo_origen
      expect(calls[0][0].tipo_origen).toBe('compra');
      expect(calls[0][0].id_origen).toBe(1);

      // Verify lastDate
      expect(result.lastDate).toBe('2026-02-15');
    });

    it('should generate gastos with credit card due dates', async () => {
      const compra = {
        id: 2,
        descripcion: 'TV',
        monto_total: 12000,
        monto_total_ars: 12000,
        monto_total_usd: 12,
        cantidad_cuotas: 12,
        fecha_compra: '2025-12-10',
        moneda_origen: 'ARS',
        tipo_cambio_usado: 1000,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 3,
        tarjeta_id: 1,
        tarjeta: { tipo: 'credito', dia_mes_cierre: 20, dia_mes_vencimiento: 10 },
        usuario_id: 1
      };

      const result = await strategy.generateHistoricalInstallments(compra, 3, mockTransaction);

      expect(result.gastos).toHaveLength(3);

      // Credit card: compra Dec 10, cierre 20, vto 10
      // Dec 10 <= cierre Dec 20 → first due: Jan 10
      // Cuota 2: Feb 10, Cuota 3: Mar 10
      const calls = mockGastoCreate.mock.calls;
      expect(calls[0][0].fecha).toBe('2026-01-10');
      expect(calls[1][0].fecha).toBe('2026-02-10');
      expect(calls[2][0].fecha).toBe('2026-03-10');

      // Verify multi-currency amounts (12000/12=1000 ARS, 12/12=1 USD)
      expect(calls[0][0].monto_ars).toBe(1000);
      expect(calls[0][0].monto_usd).toBe(1);
    });

    it('should handle day clamping for months with fewer days', async () => {
      const compra = {
        id: 3,
        descripcion: 'Compra fin de mes',
        monto_total: 3000,
        monto_total_ars: 3000,
        monto_total_usd: null,
        cantidad_cuotas: 3,
        fecha_compra: '2025-10-31',
        moneda_origen: 'ARS',
        tipo_cambio_usado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 2,
        tarjeta_id: null,
        tarjeta: null,
        usuario_id: 1
      };

      const result = await strategy.generateHistoricalInstallments(compra, 3, mockTransaction);

      const calls = mockGastoCreate.mock.calls;
      expect(calls[0][0].fecha).toBe('2025-10-31');
      expect(calls[1][0].fecha).toBe('2025-11-30'); // Nov clamps 31 → 30
      expect(calls[2][0].fecha).toBe('2025-12-31');
    });

    it('should handle single installment fully paid', async () => {
      const compra = {
        id: 4,
        descripcion: 'Gasto único',
        monto_total: 500,
        monto_total_ars: 500,
        monto_total_usd: null,
        cantidad_cuotas: 1,
        fecha_compra: '2026-03-01',
        moneda_origen: 'ARS',
        tipo_cambio_usado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        tarjeta_id: null,
        tarjeta: null,
        usuario_id: 1
      };

      const result = await strategy.generateHistoricalInstallments(compra, 1, mockTransaction);

      expect(result.gastos).toHaveLength(1);
      const call = mockGastoCreate.mock.calls[0][0];
      expect(call.descripcion).toBe('Gasto único - Cuota 1/1');
      expect(call.monto_ars).toBe(500); // Full amount for single cuota
    });

    it('should clamp future dates to today', async () => {
      const compra = {
        id: 6,
        descripcion: 'Compra reciente',
        monto_total: 6000,
        monto_total_ars: 6000,
        monto_total_usd: null,
        cantidad_cuotas: 6,
        fecha_compra: '2026-02-15',
        moneda_origen: 'ARS',
        tipo_cambio_usado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 2,
        tarjeta_id: null,
        tarjeta: null,
        usuario_id: 1
      };

      // 3 cuotas: Feb 15 (past), Mar 15 (past), Apr 15 (future → clamped)
      const result = await strategy.generateHistoricalInstallments(compra, 3, mockTransaction);

      const calls = mockGastoCreate.mock.calls;
      expect(calls[0][0].fecha).toBe('2026-02-15');
      expect(calls[1][0].fecha).toBe('2026-03-15');
      // Apr 15 is future, should be clamped to today
      const moment = (await import('moment-timezone')).default;
      const today = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
      expect(calls[2][0].fecha).toBe(today);
    });

    it('should pass transaction to all Gasto.create calls', async () => {
      const compra = {
        id: 5,
        descripcion: 'Test',
        monto_total: 2000,
        monto_total_ars: 2000,
        monto_total_usd: null,
        cantidad_cuotas: 4,
        fecha_compra: '2026-01-15',
        moneda_origen: 'ARS',
        tipo_cambio_usado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 2,
        tarjeta_id: null,
        tarjeta: null,
        usuario_id: 1
      };

      await strategy.generateHistoricalInstallments(compra, 2, mockTransaction);

      expect(mockGastoCreate).toHaveBeenCalledTimes(2);
      expect(mockGastoCreate.mock.calls[0][1]).toEqual({ transaction: mockTransaction });
      expect(mockGastoCreate.mock.calls[1][1]).toEqual({ transaction: mockTransaction });
    });
  });
});
