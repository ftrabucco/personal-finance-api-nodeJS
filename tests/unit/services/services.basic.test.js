import { jest } from '@jest/globals';

/**
 * Basic unit tests for all migrated services
 * Tests that services can be instantiated and have correct methods
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

// Mock core dependencies
jest.unstable_mockModule('../../../src/db/postgres.js', () => ({
  default: mockSequelize
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  GastoRecurrente: { name: 'GastoRecurrente' },
  DebitoAutomatico: { name: 'DebitoAutomatico' },
  GastoUnico: { name: 'GastoUnico' },
  Compra: { name: 'Compra' },
  Gasto: { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {}
}));

// Import services after mocking
const { GastoRecurrenteService } = await import('../../../src/services/gastoRecurrente.service.js');
const { DebitoAutomaticoService } = await import('../../../src/services/debitoAutomatico.service.js');
const { GastoUnicoService } = await import('../../../src/services/gastoUnico.service.js');
const { ComprasService } = await import('../../../src/services/compras.service.js');
const { BaseService } = await import('../../../src/services/base.service.js');

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
    test('should be instantiable and extend BaseService', () => {
      const service = new GastoUnicoService();

      expect(service).toBeInstanceOf(BaseService);
      expect(service.modelName).toBe('GastoUnico');
    });

    test('should have immediate strategy integration', () => {
      const service = new GastoUnicoService();

      expect(service.immediateStrategy).toBeDefined();
      expect(typeof service.createWithGastoReal).toBe('function');
      expect(typeof service.generateRealExpense).toBe('function');
      expect(typeof service.markAsProcessed).toBe('function');
    });

    test('should have business methods', () => {
      const service = new GastoUnicoService();

      expect(typeof service.findUnprocessed).toBe('function');
      expect(typeof service.findProcessed).toBe('function');
      expect(typeof service.updateAssociatedGasto).toBe('function');
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