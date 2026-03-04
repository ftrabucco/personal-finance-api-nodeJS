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

// Mock strategies with factory functions
const mockImmediateGenerate = jest.fn();
const mockRecurringGenerateWithDate = jest.fn();
const mockAutomaticDebitGenerate = jest.fn();
const mockInstallmentShouldGenerate = jest.fn();
const mockInstallmentGenerate = jest.fn();

jest.unstable_mockModule('../../../src/strategies/expenseGeneration/immediateStrategy.js', () => ({
  ImmediateExpenseStrategy: class {
    generate = mockImmediateGenerate;
  }
}));

jest.unstable_mockModule('../../../src/strategies/expenseGeneration/recurringStrategy.js', () => ({
  RecurringExpenseStrategy: class {
    generateWithDate = mockRecurringGenerateWithDate;
  }
}));

jest.unstable_mockModule('../../../src/strategies/expenseGeneration/automaticDebitStrategy.js', () => ({
  AutomaticDebitExpenseStrategy: class {
    generate = mockAutomaticDebitGenerate;
  }
}));

jest.unstable_mockModule('../../../src/strategies/expenseGeneration/installmentStrategy.js', () => ({
  InstallmentExpenseStrategy: class {
    shouldGenerate = mockInstallmentShouldGenerate;
    generate = mockInstallmentGenerate;
  }
}));

// Mock services with factory functions
const mockFindReadyRecurrentes = jest.fn().mockResolvedValue([]);
const mockFindReadyDebitos = jest.fn().mockResolvedValue([]);
const mockFindReadyCompras = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../../src/services/gastoRecurrente.service.js', () => ({
  GastoRecurrenteService: class {
    findReadyForGeneration = mockFindReadyRecurrentes;
  }
}));

jest.unstable_mockModule('../../../src/services/debitoAutomatico.service.js', () => ({
  DebitoAutomaticoService: class {
    findReadyForGeneration = mockFindReadyDebitos;
  }
}));

jest.unstable_mockModule('../../../src/services/compras.service.js', () => ({
  ComprasService: class {
    findReadyForGeneration = mockFindReadyCompras;
  }
}));

// Mock models
const mockGastoUnicoFindAll = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  GastoUnico: {
    findAll: mockGastoUnicoFindAll
  },
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {}
}));

// Import the service after all mocks
const { GastoGeneratorService } = await import('../../../src/services/gastoGenerator.service.js');
const sequelize = (await import('../../../src/db/postgres.js')).default;

describe('GastoGeneratorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('validateCompraForeignKeys', () => {
    it('should return empty array when all keys are present', () => {
      const compra = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };
      const result = GastoGeneratorService.validateCompraForeignKeys(compra);
      expect(result).toEqual([]);
    });

    it('should return missing keys when categoria_gasto_id is missing', () => {
      const compra = {
        importancia_gasto_id: 1,
        tipo_pago_id: 1
      };
      const result = GastoGeneratorService.validateCompraForeignKeys(compra);
      expect(result).toContain('categoria_gasto_id');
    });

    it('should return missing keys when importancia_gasto_id is missing', () => {
      const compra = {
        categoria_gasto_id: 1,
        tipo_pago_id: 1
      };
      const result = GastoGeneratorService.validateCompraForeignKeys(compra);
      expect(result).toContain('importancia_gasto_id');
    });

    it('should return missing keys when tipo_pago_id is missing', () => {
      const compra = {
        categoria_gasto_id: 1,
        importancia_gasto_id: 1
      };
      const result = GastoGeneratorService.validateCompraForeignKeys(compra);
      expect(result).toContain('tipo_pago_id');
    });

    it('should return all missing keys when none are present', () => {
      const compra = {};
      const result = GastoGeneratorService.validateCompraForeignKeys(compra);
      expect(result).toHaveLength(3);
      expect(result).toContain('categoria_gasto_id');
      expect(result).toContain('importancia_gasto_id');
      expect(result).toContain('tipo_pago_id');
    });
  });

  describe('generateFromGastoUnico', () => {
    const mockGastoUnico = {
      id: 1,
      descripcion: 'Test gasto unico',
      update: jest.fn().mockResolvedValue()
    };

    const mockGeneratedGasto = {
      id: 100,
      monto_ars: 1000
    };

    beforeEach(() => {
      mockGastoUnico.update.mockResolvedValue();
    });

    it('should generate gasto from gasto unico successfully', async () => {
      mockImmediateGenerate.mockResolvedValue(mockGeneratedGasto);

      const result = await GastoGeneratorService.generateFromGastoUnico(mockGastoUnico);

      expect(result).toEqual(mockGeneratedGasto);
      expect(mockImmediateGenerate).toHaveBeenCalledWith(mockGastoUnico, mockTransaction);
      expect(mockGastoUnico.update).toHaveBeenCalledWith({ procesado: true }, { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockImmediateGenerate.mockRejectedValue(new Error('Strategy error'));

      await expect(GastoGeneratorService.generateFromGastoUnico(mockGastoUnico))
        .rejects.toThrow('Strategy error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('generateFromGastoRecurrente', () => {
    const mockGastoRecurrente = {
      id: 2,
      descripcion: 'Test gasto recurrente',
      frecuencia: { nombre_frecuencia: 'Mensual' }
    };

    const mockGeneratedGasto = {
      id: 101,
      monto_ars: 2000
    };

    it('should generate gasto from gasto recurrente successfully', async () => {
      mockRecurringGenerateWithDate.mockResolvedValue(mockGeneratedGasto);

      const result = await GastoGeneratorService.generateFromGastoRecurrente(mockGastoRecurrente);

      expect(result).toEqual(mockGeneratedGasto);
      expect(mockRecurringGenerateWithDate).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should use adjustedDate if provided', async () => {
      const gastoConFechaAjustada = {
        ...mockGastoRecurrente,
        adjustedDate: '2024-06-15'
      };
      mockRecurringGenerateWithDate.mockResolvedValue(mockGeneratedGasto);

      await GastoGeneratorService.generateFromGastoRecurrente(gastoConFechaAjustada);

      expect(mockRecurringGenerateWithDate).toHaveBeenCalledWith(
        gastoConFechaAjustada,
        '2024-06-15',
        mockTransaction
      );
    });

    it('should rollback transaction on error', async () => {
      mockRecurringGenerateWithDate.mockRejectedValue(new Error('Recurring error'));

      await expect(GastoGeneratorService.generateFromGastoRecurrente(mockGastoRecurrente))
        .rejects.toThrow('Recurring error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('generateFromDebitoAutomatico', () => {
    const mockDebitoAutomatico = {
      id: 3,
      descripcion: 'Test debito',
      frecuencia: { nombre_frecuencia: 'Mensual' }
    };

    const mockGeneratedGasto = {
      id: 102,
      monto_ars: 3000
    };

    it('should generate gasto from debito automatico successfully', async () => {
      mockAutomaticDebitGenerate.mockResolvedValue(mockGeneratedGasto);

      const result = await GastoGeneratorService.generateFromDebitoAutomatico(mockDebitoAutomatico);

      expect(result).toEqual(mockGeneratedGasto);
      expect(mockAutomaticDebitGenerate).toHaveBeenCalledWith(mockDebitoAutomatico, mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockAutomaticDebitGenerate.mockRejectedValue(new Error('Debit error'));

      await expect(GastoGeneratorService.generateFromDebitoAutomatico(mockDebitoAutomatico))
        .rejects.toThrow('Debit error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('generateFromCompra', () => {
    const mockCompra = {
      id: 4,
      descripcion: 'Test compra',
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1
    };

    const mockGeneratedGasto = {
      id: 103,
      monto_ars: 500
    };

    it('should generate gasto from compra when shouldGenerate returns true', async () => {
      mockInstallmentShouldGenerate.mockResolvedValue(true);
      mockInstallmentGenerate.mockResolvedValue(mockGeneratedGasto);

      const result = await GastoGeneratorService.generateFromCompra(mockCompra);

      expect(result).toEqual(mockGeneratedGasto);
      expect(mockInstallmentShouldGenerate).toHaveBeenCalledWith(mockCompra);
      expect(mockInstallmentGenerate).toHaveBeenCalledWith(mockCompra, mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return null when shouldGenerate returns false', async () => {
      mockInstallmentShouldGenerate.mockResolvedValue(false);

      const result = await GastoGeneratorService.generateFromCompra(mockCompra);

      expect(result).toBeNull();
      expect(mockInstallmentGenerate).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when foreign keys are missing', async () => {
      const compraInvalida = {
        id: 5,
        descripcion: 'Compra sin claves'
      };

      await expect(GastoGeneratorService.generateFromCompra(compraInvalida))
        .rejects.toThrow('Missing required foreign keys');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on strategy error', async () => {
      mockInstallmentShouldGenerate.mockResolvedValue(true);
      mockInstallmentGenerate.mockRejectedValue(new Error('Installment error'));

      await expect(GastoGeneratorService.generateFromCompra(mockCompra))
        .rejects.toThrow('Installment error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('generateScheduledExpenses', () => {
    beforeEach(() => {
      mockFindReadyRecurrentes.mockResolvedValue([]);
      mockFindReadyDebitos.mockResolvedValue([]);
      mockFindReadyCompras.mockResolvedValue([]);
    });

    it('should return empty results when no expenses are pending', async () => {
      const result = await GastoGeneratorService.generateScheduledExpenses();

      expect(result.success).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.summary.totalProcessed).toBe(0);
    });

    it('should filter by userId when provided', async () => {
      await GastoGeneratorService.generateScheduledExpenses(123);

      expect(mockFindReadyRecurrentes).toHaveBeenCalledWith(123);
      expect(mockFindReadyDebitos).toHaveBeenCalledWith(123);
      expect(mockFindReadyCompras).toHaveBeenCalledWith(123);
    });

    it('should include processing time in results', async () => {
      const result = await GastoGeneratorService.generateScheduledExpenses();

      expect(result.summary.processing_time_ms).toBeDefined();
      expect(result.summary.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should have breakdown for each expense type', async () => {
      const result = await GastoGeneratorService.generateScheduledExpenses();

      expect(result.summary.breakdown).toBeDefined();
      expect(result.summary.breakdown.recurrentes).toBeDefined();
      expect(result.summary.breakdown.debitos).toBeDefined();
      expect(result.summary.breakdown.compras).toBeDefined();
    });

    it('should process recurring expenses when available', async () => {
      const mockRecurringExpense = {
        id: 10,
        descripcion: 'Recurring test',
        frecuencia: { nombre_frecuencia: 'Mensual' }
      };
      mockFindReadyRecurrentes.mockResolvedValue([mockRecurringExpense]);
      mockRecurringGenerateWithDate.mockResolvedValue({ id: 1000, monto_ars: 500 });

      const result = await GastoGeneratorService.generateScheduledExpenses();

      expect(result.success.length).toBeGreaterThan(0);
      expect(result.summary.breakdown.recurrentes.processed).toBe(1);
    });
  });

  describe('processExpensesBatch', () => {
    it('should process empty batch without errors', async () => {
      const results = { success: [], errors: [] };

      await GastoGeneratorService.processExpensesBatch(
        [],
        'test',
        jest.fn(),
        results
      );

      expect(results.success).toHaveLength(0);
      expect(results.errors).toHaveLength(0);
    });

    it('should add to success when generator succeeds', async () => {
      const results = { success: [], errors: [] };
      const mockExpense = { id: 1, descripcion: 'Test' };
      const mockGasto = { id: 100, monto_ars: 1000 };
      const mockGenerator = jest.fn().mockResolvedValue(mockGasto);

      await GastoGeneratorService.processExpensesBatch(
        [mockExpense],
        'recurrente',
        mockGenerator,
        results
      );

      expect(results.success).toHaveLength(1);
      expect(results.success[0].type).toBe('recurrente');
      expect(results.success[0].id).toBe(100);
      expect(results.success[0].source_id).toBe(1);
    });

    it('should add to errors when generator fails', async () => {
      const results = { success: [], errors: [] };
      const mockExpense = { id: 1, descripcion: 'Test' };
      const mockGenerator = jest.fn().mockRejectedValue(new Error('Generator failed'));

      await GastoGeneratorService.processExpensesBatch(
        [mockExpense],
        'recurrente',
        mockGenerator,
        results
      );

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].type).toBe('recurrente');
      expect(results.errors[0].id).toBe(1);
      expect(results.errors[0].error).toBe('Generator failed');
    });

    it('should handle null result from generator (skipped)', async () => {
      const results = { success: [], errors: [] };
      const mockExpense = { id: 1, descripcion: 'Test' };
      const mockGenerator = jest.fn().mockResolvedValue(null);

      await GastoGeneratorService.processExpensesBatch(
        [mockExpense],
        'recurrente',
        mockGenerator,
        results
      );

      // null result means skipped, not added to success or errors
      expect(results.success).toHaveLength(0);
      expect(results.errors).toHaveLength(0);
    });

    it('should process multiple expenses', async () => {
      const results = { success: [], errors: [] };
      const mockExpenses = [
        { id: 1, descripcion: 'Test 1' },
        { id: 2, descripcion: 'Test 2' },
        { id: 3, descripcion: 'Test 3' }
      ];

      let callCount = 0;
      const mockGenerator = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ id: 100 + callCount, monto_ars: 1000 });
      });

      await GastoGeneratorService.processExpensesBatch(
        mockExpenses,
        'debito',
        mockGenerator,
        results
      );

      expect(results.success).toHaveLength(3);
      expect(mockGenerator).toHaveBeenCalledTimes(3);
    });

    it('should process in batches of 10', async () => {
      const results = { success: [], errors: [] };
      // Create 25 expenses to test batching
      const mockExpenses = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        descripcion: `Test ${i + 1}`
      }));

      const mockGenerator = jest.fn().mockResolvedValue({ id: 1, monto_ars: 100 });

      await GastoGeneratorService.processExpensesBatch(
        mockExpenses,
        'test',
        mockGenerator,
        results
      );

      expect(mockGenerator).toHaveBeenCalledTimes(25);
      expect(results.success).toHaveLength(25);
    });
  });

  describe('generatePendingExpenses', () => {
    beforeEach(() => {
      mockFindReadyRecurrentes.mockResolvedValue([]);
      mockFindReadyDebitos.mockResolvedValue([]);
      mockFindReadyCompras.mockResolvedValue([]);
      mockGastoUnicoFindAll.mockResolvedValue([]);
    });

    it('should return combined results from scheduled and unique expenses', async () => {
      const result = await GastoGeneratorService.generatePendingExpenses(123);

      expect(result.success).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should query gastos unicos with procesado: false', async () => {
      await GastoGeneratorService.generatePendingExpenses(123);

      expect(mockGastoUnicoFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            procesado: false,
            usuario_id: 123
          }
        })
      );
    });

    it('should process gastos unicos and add to results', async () => {
      const mockGastoUnico = {
        id: 50,
        descripcion: 'Test unico',
        update: jest.fn().mockResolvedValue()
      };
      const mockGeneratedGasto = { id: 500, monto_ars: 100 };

      mockGastoUnicoFindAll.mockResolvedValue([mockGastoUnico]);
      mockImmediateGenerate.mockResolvedValue(mockGeneratedGasto);

      const result = await GastoGeneratorService.generatePendingExpenses(123);

      expect(result.success).toContainEqual({
        type: 'unico',
        id: 500,
        source_id: 50
      });
    });

    it('should handle errors in gasto unico processing', async () => {
      const mockGastoUnico = {
        id: 50,
        descripcion: 'Test unico error',
        update: jest.fn().mockResolvedValue()
      };

      mockGastoUnicoFindAll.mockResolvedValue([mockGastoUnico]);
      mockImmediateGenerate.mockRejectedValue(new Error('Unico generation error'));

      const result = await GastoGeneratorService.generatePendingExpenses(123);

      expect(result.errors).toContainEqual({
        type: 'unico',
        id: 50,
        error: 'Unico generation error'
      });
    });

    it('should query all users when userId is not provided', async () => {
      await GastoGeneratorService.generatePendingExpenses(null);

      expect(mockGastoUnicoFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            procesado: false
          }
        })
      );
    });
  });
});
