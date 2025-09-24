import { jest } from '@jest/globals';

// Mock the models and dependencies
const mockGastoRecurrente = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../models/index.js', () => ({
  GastoRecurrente: mockGastoRecurrente,
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {}
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger
}));

// Import the service after mocking
const { GastoRecurrenteService } = await import('../gastoRecurrente.service.js');

describe('GastoRecurrenteService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GastoRecurrenteService();
  });

  describe('Inheritance from BaseService', () => {
    test('should inherit from BaseService', () => {
      expect(service.model).toBe(mockGastoRecurrente);
      expect(service.modelName).toBe('GastoRecurrente');
    });

    test('should have access to BaseService methods', () => {
      expect(typeof service.create).toBe('function');
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findById).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.delete).toBe('function');
      expect(typeof service.count).toBe('function');
      expect(typeof service.findWithPagination).toBe('function');
    });
  });

  describe('Domain-specific methods', () => {
    test('should have recurring expense specific methods', () => {
      expect(typeof service.findActive).toBe('function');
      expect(typeof service.findByFrequency).toBe('function');
      expect(typeof service.findReadyForGeneration).toBe('function');
      expect(typeof service.toggleActive).toBe('function');
      expect(typeof service.validateRecurringExpenseData).toBe('function');
    });

    test('findActive should call findAll with active filter', async () => {
      const mockResult = [{ id: 1, activo: true }];
      service.findAll = jest.fn().mockResolvedValue(mockResult);

      const result = await service.findActive();

      expect(service.findAll).toHaveBeenCalledWith({
        where: { activo: true }
      });
      expect(result).toBe(mockResult);
    });

    test('findByFrequency should call findAll with frequency filter', async () => {
      const frecuenciaId = 1;
      const mockResult = [{ id: 1, frecuencia_gasto_id: frecuenciaId }];
      service.findAll = jest.fn().mockResolvedValue(mockResult);

      const result = await service.findByFrequency(frecuenciaId);

      expect(service.findAll).toHaveBeenCalledWith({
        where: { frecuencia_gasto_id: frecuenciaId }
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('Override methods with associations', () => {
    test('findAll should include default associations', async () => {
      const mockResult = [{ id: 1 }];
      mockGastoRecurrente.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll();

      expect(mockGastoRecurrente.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ as: 'categoria' }),
            expect.objectContaining({ as: 'importancia' }),
            expect.objectContaining({ as: 'tipoPago' }),
            expect.objectContaining({ as: 'tarjeta' }),
            expect.objectContaining({ as: 'frecuencia' })
          ]),
          order: [['id', 'DESC']]
        })
      );
      expect(result).toBe(mockResult);
    });

    test('findById should include default associations', async () => {
      const mockResult = { id: 1 };
      mockGastoRecurrente.findByPk.mockResolvedValue(mockResult);

      const result = await service.findById(1);

      expect(mockGastoRecurrente.findByPk).toHaveBeenCalledWith(
        1,
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
      expect(result).toBe(mockResult);
    });
  });

  describe('Data validation', () => {
    test('validateRecurringExpenseData should validate amount', () => {
      expect(() => {
        service.validateRecurringExpenseData({ monto: -100 });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ monto: 'invalid' });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ monto: 100 });
      }).not.toThrow();
    });

    test('validateRecurringExpenseData should validate payment day', () => {
      expect(() => {
        service.validateRecurringExpenseData({ dia_de_pago: 0 });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ dia_de_pago: 32 });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ dia_de_pago: 15 });
      }).not.toThrow();
    });

    test('validateRecurringExpenseData should validate payment month', () => {
      expect(() => {
        service.validateRecurringExpenseData({ mes_de_pago: 0 });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ mes_de_pago: 13 });
      }).toThrow('Validation failed for recurring expense');

      expect(() => {
        service.validateRecurringExpenseData({ mes_de_pago: 6 });
      }).not.toThrow();

      expect(() => {
        service.validateRecurringExpenseData({ mes_de_pago: null });
      }).not.toThrow();
    });
  });

  describe('Business logic in create method', () => {
    test('create should validate data and set defaults', async () => {
      const inputData = {
        descripcion: 'Test expense',
        monto: 1000,
        dia_de_pago: 15
      };

      const mockCreatedExpense = {
        id: 1,
        ...inputData,
        activo: true,
        ultima_fecha_generado: null
      };

      mockGastoRecurrente.create.mockResolvedValue(mockCreatedExpense);

      const result = await service.create(inputData);

      expect(mockGastoRecurrente.create).toHaveBeenCalledWith({
        ...inputData,
        activo: true,
        ultima_fecha_generado: null
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Recurring expense created successfully',
        expect.objectContaining({
          id: 1,
          descripcion: 'Test expense',
          monto: 1000
        })
      );

      expect(result).toBe(mockCreatedExpense);
    });

    test('create should preserve explicit activo value', async () => {
      const inputData = {
        descripcion: 'Test expense',
        monto: 1000,
        dia_de_pago: 15,
        activo: false
      };

      mockGastoRecurrente.create.mockResolvedValue({
        id: 1,
        ...inputData,
        ultima_fecha_generado: null
      });

      await service.create(inputData);

      expect(mockGastoRecurrente.create).toHaveBeenCalledWith({
        ...inputData,
        activo: false,
        ultima_fecha_generado: null
      });
    });
  });

  describe('Business logic in update method', () => {
    test('update should log amount changes', async () => {
      const existingExpense = {
        id: 1,
        descripcion: 'Test expense',
        monto: 1000,
        activo: true
      };

      const updateData = { monto: 1500 };
      const updatedExpense = { ...existingExpense, ...updateData };

      service.findById = jest.fn().mockResolvedValue(existingExpense);
      mockGastoRecurrente.findByPk.mockResolvedValue({
        update: jest.fn().mockResolvedValue(updatedExpense)
      });

      await service.update(1, updateData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Recurring expense amount updated',
        {
          id: 1,
          oldAmount: 1000,
          newAmount: 1500,
          descripcion: 'Test expense'
        }
      );
    });

    test('update should log deactivation', async () => {
      const existingExpense = {
        id: 1,
        descripcion: 'Test expense',
        monto: 1000,
        activo: true
      };

      const updateData = { activo: false };
      const updatedExpense = { ...existingExpense, ...updateData };

      service.findById = jest.fn().mockResolvedValue(existingExpense);
      mockGastoRecurrente.findByPk.mockResolvedValue({
        update: jest.fn().mockResolvedValue(updatedExpense)
      });

      await service.update(1, updateData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Recurring expense deactivated',
        {
          id: 1,
          descripcion: 'Test expense'
        }
      );
    });
  });

  describe('Legacy compatibility', () => {
    test('legacy export should work', async () => {
      const { default: legacyService } = await import('../gastoRecurrente.service.js');

      expect(typeof legacyService.create).toBe('function');
      expect(typeof legacyService.findAll).toBe('function');
      expect(typeof legacyService.findById).toBe('function');
      expect(typeof legacyService.update).toBe('function');
      expect(typeof legacyService.delete).toBe('function');
    });
  });
});