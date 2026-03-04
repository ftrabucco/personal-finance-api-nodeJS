import { jest } from '@jest/globals';

/**
 * Basic unit tests for all migrated services
 * Tests that services can be instantiated and have correct methods
 *
 * Note: GastoUnicoService now uses DI and requires mock dependencies
 */

// Mock dependencies
const mockSequelize = {
  transaction: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// Mock models for DI-enabled services
const mockModels = {
  GastoRecurrente: { name: 'GastoRecurrente' },
  DebitoAutomatico: { name: 'DebitoAutomatico' },
  GastoUnico: { name: 'GastoUnico', findByPk: jest.fn(), update: jest.fn() },
  Compra: { name: 'Compra' },
  Gasto: { create: jest.fn(), findOne: jest.fn(), update: jest.fn(), destroy: jest.fn() },
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {},
  TipoCambio: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() }
};

// Mock transaction manager for DI services
const mockTransactionManager = {
  withTransaction: jest.fn(async (callback) => {
    const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    return callback(mockTransaction);
  }),
  withRetry: jest.fn(async (callback) => callback())
};

// Mock immediate strategy
const mockImmediateStrategy = {
  generate: jest.fn()
};

// Mock exchange rate service
const mockExchangeRateService = {
  calculateBothCurrencies: jest.fn().mockResolvedValue({
    monto_ars: 1000,
    monto_usd: 1,
    tipo_cambio_usado: 1000
  })
};

// Mock core dependencies
jest.unstable_mockModule('../../../src/db/postgres.js', () => ({
  default: mockSequelize
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => mockModels);

// Import services after mocking
const { GastoRecurrenteService } = await import('../../../src/services/gastoRecurrente.service.js');
const { DebitoAutomaticoService } = await import('../../../src/services/debitoAutomatico.service.js');
const { GastoUnicoService } = await import('../../../src/services/gastoUnico.service.js');
const { ComprasService } = await import('../../../src/services/compras.service.js');
const { BaseService } = await import('../../../src/services/base.service.js');

/**
 * Creates mock dependencies for GastoUnicoService (DI-enabled)
 */
function createGastoUnicoServiceDeps() {
  return {
    models: mockModels,
    transactionManager: mockTransactionManager,
    immediateStrategy: mockImmediateStrategy,
    exchangeRateService: mockExchangeRateService,
    logger: mockLogger
  };
}

describe('Services Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BaseService', () => {
    test('should be instantiable with a model', () => {
      const mockModel = { name: 'TestModel' };
      const service = new BaseService(mockModel);

      expect(service.model).toBe(mockModel);
      expect(service.modelName).toBe('TestModel');
    });

    test('should have all CRUD methods', () => {
      const mockModel = { name: 'TestModel' };
      const service = new BaseService(mockModel);

      expect(typeof service.create).toBe('function');
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findById).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.delete).toBe('function');
      expect(typeof service.count).toBe('function');
      expect(typeof service.findWithPagination).toBe('function');
    });
  });

  describe('GastoRecurrenteService', () => {
    test('should be instantiable and extend BaseService', () => {
      const service = new GastoRecurrenteService();

      expect(service).toBeInstanceOf(BaseService);
      expect(service.modelName).toBe('GastoRecurrente');
    });

    test('should have specific business methods', () => {
      const service = new GastoRecurrenteService();

      expect(typeof service.findActive).toBe('function');
      expect(typeof service.findByFrequency).toBe('function');
      expect(typeof service.findReadyForGeneration).toBe('function');
      expect(typeof service.toggleActive).toBe('function');
    });
  });

  describe('DebitoAutomaticoService', () => {
    test('should be instantiable and extend BaseService', () => {
      const service = new DebitoAutomaticoService();

      expect(service).toBeInstanceOf(BaseService);
      expect(service.modelName).toBe('DebitoAutomatico');
    });

    test('should have specific business methods', () => {
      const service = new DebitoAutomaticoService();

      expect(typeof service.findActive).toBe('function');
      expect(typeof service.findByFrequency).toBe('function');
      expect(typeof service.findReadyForGeneration).toBe('function');
      expect(typeof service.findExpiring).toBe('function');
      expect(typeof service.toggleActive).toBe('function');
    });
  });

  describe('GastoUnicoService', () => {
    // GastoUnicoService now uses DI - requires mock dependencies
    test('should be instantiable with DI dependencies and extend BaseService', () => {
      const deps = createGastoUnicoServiceDeps();
      const service = new GastoUnicoService(deps);

      expect(service).toBeInstanceOf(BaseService);
      expect(service.modelName).toBe('GastoUnico');
    });

    test('should have immediate strategy integration', () => {
      const deps = createGastoUnicoServiceDeps();
      const service = new GastoUnicoService(deps);

      expect(service.immediateStrategy).toBeDefined();
      expect(typeof service.createWithGastoReal).toBe('function');
      expect(typeof service.generateRealExpense).toBe('function');
      expect(typeof service.markAsProcessed).toBe('function');
    });

    test('should have business methods', () => {
      const deps = createGastoUnicoServiceDeps();
      const service = new GastoUnicoService(deps);

      expect(typeof service.findUnprocessed).toBe('function');
      expect(typeof service.findProcessed).toBe('function');
      expect(typeof service.updateAssociatedGasto).toBe('function');
    });

    test('should have DI dependencies properly injected', () => {
      const deps = createGastoUnicoServiceDeps();
      const service = new GastoUnicoService(deps);

      expect(service.models).toBe(mockModels);
      expect(service.transactionManager).toBe(mockTransactionManager);
      expect(service.immediateStrategy).toBe(mockImmediateStrategy);
      expect(service.exchangeRateService).toBe(mockExchangeRateService);
      expect(service.logger).toBe(mockLogger);
    });
  });

  describe('ComprasService', () => {
    test('should be instantiable and extend BaseService', () => {
      const service = new ComprasService();

      expect(service).toBeInstanceOf(BaseService);
      expect(service.modelName).toBe('Compra');
    });

    test('should have installment strategy integration', () => {
      const service = new ComprasService();

      expect(service.installmentStrategy).toBeDefined();
      expect(typeof service.findReadyForGeneration).toBe('function');
      expect(typeof service.generateNextInstallment).toBe('function');
    });

    test('should have purchase-specific methods', () => {
      const service = new ComprasService();

      expect(typeof service.findPendingInstallments).toBe('function');
      expect(typeof service.findByPaymentMethod).toBe('function');
      expect(typeof service.findByCreditCard).toBe('function');
      expect(typeof service.getInstallmentSummary).toBe('function');
      expect(typeof service.stopInstallmentGeneration).toBe('function');
      expect(typeof service.resumeInstallmentGeneration).toBe('function');
    });
  });
});