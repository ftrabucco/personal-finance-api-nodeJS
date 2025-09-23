import { jest } from '@jest/globals';

/**
 * Integration Tests for Services ↔ Strategies Architecture
 * Tests the complete flow: Services → Strategies → Database
 * Validates that the migrated architecture works end-to-end
 */

// Mock dependencies
const mockSequelize = {
  transaction: jest.fn()
};

const mockGasto = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// Mock transaction object
const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn()
};

// Mock models
jest.unstable_mockModule('../../src/models/index.js', () => ({
  GastoRecurrente: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  DebitoAutomatico: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  GastoUnico: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    sequelize: mockSequelize
  },
  Compra: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Gasto: mockGasto,
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {}
}));

jest.unstable_mockModule('../../src/db/postgres.js', () => ({
  default: mockSequelize
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import services and generator after mocking
const { GastoRecurrenteService } = await import('../../src/services/gastoRecurrente.service.js');
const { DebitoAutomaticoService } = await import('../../src/services/debitoAutomatico.service.js');
const { GastoUnicoService } = await import('../../src/services/gastoUnico.service.js');
const { ComprasService } = await import('../../src/services/compras.service.js');
const { GastoGeneratorService } = await import('../../src/services/gastoGenerator.service.js');

describe('Services ↔ Strategies Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('GastoRecurrenteService Integration', () => {
    let service;

    beforeEach(() => {
      service = new GastoRecurrenteService();
    });

    test('should integrate with RecurringStrategy for expense generation', async () => {
      // Arrange
      const mockRecurringExpense = {
        id: 1,
        descripcion: 'Monthly rent',
        monto: 50000,
        dia_de_pago: 5,
        mes_de_pago: null,
        activo: true,
        ultima_fecha_generado: null,
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1,
        frecuencia_gasto_id: 1
      };

      const mockGeneratedGasto = {
        id: 100,
        descripcion: 'Monthly rent',
        monto_ars: 50000,
        tipo_origen: 'recurrente',
        id_origen: 1
      };

      mockGasto.create.mockResolvedValue(mockGeneratedGasto);

      // Act
      const result = await GastoGeneratorService.generateFromGastoRecurrente(mockRecurringExpense);

      // Assert
      expect(mockSequelize.transaction).toHaveBeenCalled();
      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: 'Monthly rent',
          monto_ars: 50000,
          tipo_origen: 'recurrente',
          id_origen: 1
        }),
        expect.objectContaining({
          transaction: mockTransaction
        })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(mockGeneratedGasto);
    });

    test('should use service methods for finding ready expenses', async () => {
      // Arrange
      const mockActiveExpenses = [
        {
          id: 1,
          dia_de_pago: new Date().getDate(), // Today
          mes_de_pago: null,
          activo: true,
          ultima_fecha_generado: null
        }
      ];

      service.findActive = jest.fn().mockResolvedValue(mockActiveExpenses);

      // Act
      const result = await service.findReadyForGeneration();

      // Assert
      expect(service.findActive).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('DebitoAutomaticoService Integration', () => {
    let service;

    beforeEach(() => {
      service = new DebitoAutomaticoService();
    });

    test('should integrate with AutomaticDebitStrategy for expense generation', async () => {
      // Arrange
      const mockAutomaticDebit = {
        id: 2,
        descripcion: 'Netflix subscription',
        monto: 1500,
        dia_de_pago: 15,
        mes_de_pago: null,
        activo: true,
        ultima_fecha_generado: null,
        categoria_gasto_id: 2,
        importancia_gasto_id: 2,
        tipo_pago_id: 1,
        frecuencia_gasto_id: 1
      };

      const mockGeneratedGasto = {
        id: 101,
        descripcion: 'Netflix subscription',
        monto_ars: 1500,
        tipo_origen: 'debito_automatico',
        id_origen: 2
      };

      mockGasto.create.mockResolvedValue(mockGeneratedGasto);

      // Act
      const result = await GastoGeneratorService.generateFromDebitoAutomatico(mockAutomaticDebit);

      // Assert
      expect(mockSequelize.transaction).toHaveBeenCalled();
      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: 'Netflix subscription',
          monto_ars: 1500,
          tipo_origen: 'debito_automatico',
          id_origen: 2
        }),
        expect.objectContaining({
          transaction: mockTransaction
        })
      );
      expect(result).toBe(mockGeneratedGasto);
    });

    test('should validate fecha_fin for automatic debits', async () => {
      // Arrange
      const invalidData = {
        fecha_inicio: '2025-01-01',
        fecha_fin: '2024-12-31' // Before start date
      };

      // Act & Assert
      expect(() => {
        service.validateAutomaticDebitData(invalidData);
      }).toThrow('Validation failed for automatic debit');
    });
  });

  describe('GastoUnicoService Integration', () => {
    let service;

    beforeEach(() => {
      service = new GastoUnicoService();
    });

    test('should integrate with ImmediateStrategy for immediate expense generation', async () => {
      // Arrange
      const mockOneTimeExpenseData = {
        descripcion: 'Emergency car repair',
        monto: 25000,
        fecha: '2025-09-22',
        categoria_gasto_id: 3,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };

      const mockCreatedGastoUnico = {
        id: 3,
        ...mockOneTimeExpenseData,
        procesado: false,
        update: jest.fn().mockResolvedValue(true)
      };

      const mockGeneratedGasto = {
        id: 102,
        descripcion: 'Emergency car repair',
        monto_ars: 25000,
        tipo_origen: 'unico',
        id_origen: 3
      };

      service.create = jest.fn().mockResolvedValue(mockCreatedGastoUnico);
      mockGasto.create.mockResolvedValue(mockGeneratedGasto);

      // Act
      const result = await service.createWithGastoReal(mockOneTimeExpenseData);

      // Assert
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockOneTimeExpenseData,
          procesado: false
        }),
        expect.objectContaining({ transaction: mockTransaction })
      );
      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: 'Emergency car repair',
          monto_ars: 25000,
          tipo_origen: 'unico',
          id_origen: 3
        }),
        expect.objectContaining({
          transaction: mockTransaction
        })
      );
      expect(mockCreatedGastoUnico.update).toHaveBeenCalledWith(
        { procesado: true },
        { transaction: mockTransaction }
      );
      expect(result).toBe(mockCreatedGastoUnico);
    });

    test('should maintain sync between GastoUnico and Gasto on updates', async () => {
      // Arrange
      const existingGastoUnico = {
        id: 3,
        descripcion: 'Original description',
        monto: 1000,
        procesado: true
      };

      const updateData = {
        descripcion: 'Updated description',
        monto: 1500
      };

      const mockAssociatedGasto = {
        id: 102,
        tipo_origen: 'unico',
        id_origen: 3
      };

      service.model.findByPk = jest.fn().mockResolvedValue(existingGastoUnico);
      service.model.update = jest.fn().mockResolvedValue([1, [{
        ...existingGastoUnico,
        ...updateData
      }]]);
      mockGasto.findOne.mockResolvedValue(mockAssociatedGasto);
      mockGasto.update.mockResolvedValue([1]);
      service.findById = jest.fn().mockResolvedValue({ ...existingGastoUnico, ...updateData });

      // Act
      const result = await service.update(3, updateData);

      // Assert
      expect(mockGasto.findOne).toHaveBeenCalledWith({
        where: {
          tipo_origen: 'unico',
          id_origen: 3
        },
        transaction: mockTransaction,
        raw: true
      });
      expect(mockGasto.update).toHaveBeenCalledWith(
        {
          descripcion: 'Updated description',
          monto_ars: 1500
        },
        {
          where: { id: 102 },
          transaction: mockTransaction
        }
      );
    });
  });

  describe('ComprasService Integration', () => {
    let service;

    beforeEach(() => {
      service = new ComprasService();
    });

    test('should integrate with InstallmentStrategy for installment generation', async () => {
      // Arrange
      const mockPurchase = {
        id: 4,
        descripcion: 'Laptop purchase',
        monto_total: 150000,
        cantidad_cuotas: 6,
        fecha_compra: '2025-09-20',
        pendiente_cuotas: true,
        categoria_gasto_id: 4,
        importancia_gasto_id: 2,
        tipo_pago_id: 3,
        tarjeta_id: 1,
        tarjeta: {
          tipo: 'credito',
          dia_vencimiento: 23,
          dia_cierre: 18
        }
      };

      const mockGeneratedGasto = {
        id: 103,
        descripcion: 'Laptop purchase - Cuota 1/6',
        monto_ars: 25000,
        tipo_origen: 'compra',
        id_origen: 4
      };

      mockGasto.create.mockResolvedValue(mockGeneratedGasto);
      mockGasto.count.mockResolvedValue(0); // No previous installments

      // Mock the strategy's shouldGenerate method
      service.installmentStrategy.shouldGenerate = jest.fn().mockResolvedValue(true);

      // Act
      const result = await GastoGeneratorService.generateFromCompra(mockPurchase);

      // Assert
      expect(service.installmentStrategy.shouldGenerate).toHaveBeenCalledWith(mockPurchase);
      expect(mockGasto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: expect.stringContaining('Cuota'),
          monto_ars: 25000,
          tipo_origen: 'compra',
          id_origen: 4
        }),
        expect.objectContaining({
          transaction: mockTransaction
        })
      );
      expect(result).toBe(mockGeneratedGasto);
    });

    test('should validate installment count correctly', async () => {
      // Arrange
      const invalidData = {
        cantidad_cuotas: 65 // Over limit
      };

      // Act & Assert
      expect(() => {
        service.validatePurchaseData(invalidData);
      }).toThrow('La cantidad de cuotas debe ser un número entero entre 1 y 60');
    });

    test('should prevent reducing installments below generated count', async () => {
      // Arrange
      const existingPurchase = {
        id: 4,
        cantidad_cuotas: 6
      };

      service.findById = jest.fn().mockResolvedValue(existingPurchase);
      service.getGeneratedInstallmentsCount = jest.fn().mockResolvedValue(3);

      const updateData = {
        cantidad_cuotas: 2 // Less than generated
      };

      // Act & Assert
      await expect(service.update(4, updateData)).rejects.toThrow(
        'No se puede reducir las cuotas a 2 porque ya se generaron 3 cuotas'
      );
    });
  });

  describe('GastoGeneratorService Orchestration', () => {
    test('should use all migrated services for scheduled generation', async () => {
      // Arrange
      const mockRecurringExpenses = [{ id: 1, tipo: 'recurrente' }];
      const mockAutomaticDebits = [{ id: 2, tipo: 'debito' }];
      const mockPurchases = [{ id: 3, tipo: 'compra' }];

      GastoGeneratorService.gastoRecurrenteService.findReadyForGeneration = jest.fn()
        .mockResolvedValue(mockRecurringExpenses);
      GastoGeneratorService.debitoAutomaticoService.findReadyForGeneration = jest.fn()
        .mockResolvedValue(mockAutomaticDebits);
      GastoGeneratorService.comprasService.findReadyForGeneration = jest.fn()
        .mockResolvedValue(mockPurchases);

      GastoGeneratorService.generateFromGastoRecurrente = jest.fn()
        .mockResolvedValue({ id: 101 });
      GastoGeneratorService.generateFromDebitoAutomatico = jest.fn()
        .mockResolvedValue({ id: 102 });
      GastoGeneratorService.generateFromCompra = jest.fn()
        .mockResolvedValue({ id: 103 });

      // Act
      const result = await GastoGeneratorService.generateScheduledExpenses();

      // Assert
      expect(GastoGeneratorService.gastoRecurrenteService.findReadyForGeneration)
        .toHaveBeenCalled();
      expect(GastoGeneratorService.debitoAutomaticoService.findReadyForGeneration)
        .toHaveBeenCalled();
      expect(GastoGeneratorService.comprasService.findReadyForGeneration)
        .toHaveBeenCalled();

      expect(result.success).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle errors gracefully and continue processing', async () => {
      // Arrange
      const mockRecurringExpenses = [{ id: 1 }, { id: 2 }];

      GastoGeneratorService.gastoRecurrenteService.findReadyForGeneration = jest.fn()
        .mockResolvedValue(mockRecurringExpenses);
      GastoGeneratorService.debitoAutomaticoService.findReadyForGeneration = jest.fn()
        .mockResolvedValue([]);
      GastoGeneratorService.comprasService.findReadyForGeneration = jest.fn()
        .mockResolvedValue([]);

      GastoGeneratorService.generateFromGastoRecurrente = jest.fn()
        .mockResolvedValueOnce({ id: 101 })
        .mockRejectedValueOnce(new Error('Generation failed'));

      // Act
      const result = await GastoGeneratorService.generateScheduledExpenses();

      // Assert
      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        type: 'recurrente',
        id: 2,
        error: 'Generation failed'
      });
    });
  });

  describe('BaseService Integration', () => {
    test('should provide consistent CRUD operations across all services', async () => {
      // Test that all services inherit the same BaseService methods
      const services = [
        new GastoRecurrenteService(),
        new DebitoAutomaticoService(),
        new GastoUnicoService(),
        new ComprasService()
      ];

      services.forEach(service => {
        expect(typeof service.create).toBe('function');
        expect(typeof service.findAll).toBe('function');
        expect(typeof service.findById).toBe('function');
        expect(typeof service.update).toBe('function');
        expect(typeof service.delete).toBe('function');
        expect(typeof service.count).toBe('function');
        expect(typeof service.findWithPagination).toBe('function');
      });
    });

    test('should use model-specific associations in findAll', async () => {
      // Arrange
      const service = new GastoRecurrenteService();
      const mockResult = [{ id: 1 }];
      service.model.findAll = jest.fn().mockResolvedValue(mockResult);

      // Act
      await service.findAll();

      // Assert
      expect(service.model.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ as: 'categoria' }),
            expect.objectContaining({ as: 'importancia' }),
            expect.objectContaining({ as: 'tipoPago' }),
            expect.objectContaining({ as: 'tarjeta' }),
            expect.objectContaining({ as: 'frecuencia' })
          ])
        })
      );
    });
  });

  describe('Error Handling and Logging Integration', () => {
    test('should log important operations consistently', async () => {
      // Arrange
      const service = new GastoUnicoService();
      const mockData = {
        descripcion: 'Test expense',
        monto: 1000
      };

      service.create = jest.fn().mockResolvedValue({
        id: 1,
        ...mockData,
        procesado: false
      });

      // Act
      await service.create(mockData);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Simple one-time expense created',
        expect.objectContaining({
          id: 1,
          descripcion: 'Test expense',
          monto: 1000
        })
      );
    });

    test('should handle transaction rollbacks on errors', async () => {
      // Arrange
      const service = new GastoUnicoService();
      mockGasto.create.mockRejectedValue(new Error('Database error'));

      const mockData = {
        descripcion: 'Test expense',
        monto: 1000
      };

      // Act & Assert
      await expect(service.createWithGastoReal(mockData)).rejects.toThrow('Database error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating one-time expense with real expense',
        expect.objectContaining({
          error: 'Database error'
        })
      );
    });
  });
});