import { jest } from '@jest/globals';
import { Op } from 'sequelize';

/**
 * Unit tests for TarjetaService
 * Tests business logic, validation, and data normalization
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

const mockTarjeta = {
  findOne: jest.fn(),
  findAndCountAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
};

const mockGasto = {
  count: jest.fn()
};

const mockCompra = {
  count: jest.fn()
};

// Mock core dependencies
jest.unstable_mockModule('../../../src/db/postgres.js', () => ({
  default: mockSequelize
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Tarjeta: mockTarjeta,
  Gasto: mockGasto,
  Compra: mockCompra
}));

// Import service after mocking
const { TarjetaService } = await import('../../../src/services/tarjeta.service.js');

describe('TarjetaService', () => {
  let tarjetaService;

  beforeEach(() => {
    jest.clearAllMocks();
    tarjetaService = new TarjetaService();
  });

  describe('Constructor', () => {
    test('should be instantiable', () => {
      expect(tarjetaService).toBeDefined();
      expect(tarjetaService.model).toBe(mockTarjeta);
    });
  });

  describe('findByIdAndUser', () => {
    test('should find tarjeta by id and user', async () => {
      const mockTarjetaData = { id: 1, nombre: 'Visa', usuario_id: 1 };
      mockTarjeta.findOne.mockResolvedValue(mockTarjetaData);

      const result = await tarjetaService.findByIdAndUser(1, 1);

      expect(mockTarjeta.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuario_id: 1 }
      });
      expect(result).toBe(mockTarjetaData);
    });

    test('should return null when tarjeta not found', async () => {
      mockTarjeta.findOne.mockResolvedValue(null);

      const result = await tarjetaService.findByIdAndUser(999, 1);

      expect(result).toBeNull();
    });

    test('should log error and throw when database error occurs', async () => {
      const error = new Error('Database error');
      mockTarjeta.findOne.mockRejectedValue(error);

      await expect(tarjetaService.findByIdAndUser(1, 1)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al buscar tarjeta por ID y usuario:',
        { error, id: 1, userId: 1 }
      );
    });
  });

  describe('validateTarjetaUsage', () => {
    test('should return not in use when no gastos or compras', async () => {
      mockGasto.count.mockResolvedValue(0);
      mockCompra.count.mockResolvedValue(0);

      const result = await tarjetaService.validateTarjetaUsage(1);

      expect(result).toEqual({
        inUse: false,
        usage: {
          gastos: 0,
          compras: 0,
          total: 0
        }
      });
    });

    test('should return in use when gastos exist', async () => {
      mockGasto.count.mockResolvedValue(5);
      mockCompra.count.mockResolvedValue(0);

      const result = await tarjetaService.validateTarjetaUsage(1);

      expect(result).toEqual({
        inUse: true,
        usage: {
          gastos: 5,
          compras: 0,
          total: 5
        }
      });
    });

    test('should return in use when compras exist', async () => {
      mockGasto.count.mockResolvedValue(0);
      mockCompra.count.mockResolvedValue(3);

      const result = await tarjetaService.validateTarjetaUsage(1);

      expect(result).toEqual({
        inUse: true,
        usage: {
          gastos: 0,
          compras: 3,
          total: 3
        }
      });
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockGasto.count.mockRejectedValue(error);

      await expect(tarjetaService.validateTarjetaUsage(1)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al validar uso de tarjeta:',
        { error, tarjetaId: 1 }
      );
    });
  });

  describe('normalizeTarjetaData', () => {
    test('should normalize debit card data', () => {
      const debitData = {
        nombre: '  Visa Debit  ',
        banco: '  Banco Nacion  ',
        tipo: 'debito',
        dia_mes_cierre: 15,
        dia_mes_vencimiento: 10,
        permite_cuotas: true
      };

      const normalized = tarjetaService.normalizeTarjetaData(debitData);

      expect(normalized).toEqual({
        nombre: 'Visa Debit',
        banco: 'Banco Nacion',
        tipo: 'debito',
        permite_cuotas: false,
        dia_mes_cierre: null,
        dia_mes_vencimiento: null,
        ultimos_4_digitos: null
      });
    });

    test('should preserve ultimos_4_digitos when normalizing', () => {
      const cardData = {
        nombre: '  Visa Credit  ',
        banco: '  Banco Nacion  ',
        tipo: 'credito',
        dia_mes_cierre: 15,
        dia_mes_vencimiento: 10,
        ultimos_4_digitos: '5678'
      };

      const normalized = tarjetaService.normalizeTarjetaData(cardData);

      expect(normalized.ultimos_4_digitos).toBe('5678');
    });

    test('should normalize credit card data', () => {
      const creditData = {
        nombre: '  Visa Credit  ',
        banco: '  Banco Nacion  ',
        tipo: 'credito',
        dia_mes_cierre: 15,
        dia_mes_vencimiento: 10
      };

      const normalized = tarjetaService.normalizeTarjetaData(creditData);

      expect(normalized).toEqual({
        nombre: 'Visa Credit',
        banco: 'Banco Nacion',
        tipo: 'credito',
        permite_cuotas: true,
        dia_mes_cierre: 15,
        dia_mes_vencimiento: 10,
        ultimos_4_digitos: null
      });
    });

    test('should normalize virtual card with default permite_cuotas', () => {
      const virtualData = {
        nombre: 'Virtual Card',
        banco: 'Online Bank',
        tipo: 'virtual'
      };

      const normalized = tarjetaService.normalizeTarjetaData(virtualData);

      expect(normalized).toEqual({
        nombre: 'Virtual Card',
        banco: 'Online Bank',
        tipo: 'virtual',
        permite_cuotas: false,
        ultimos_4_digitos: null
      });
    });

    test('should preserve virtual card permite_cuotas if specified', () => {
      const virtualData = {
        nombre: 'Virtual Card',
        banco: 'Online Bank',
        tipo: 'virtual',
        permite_cuotas: true
      };

      const normalized = tarjetaService.normalizeTarjetaData(virtualData);

      expect(normalized.permite_cuotas).toBe(true);
    });
  });

  describe('getWithFilters', () => {
    test('should get tarjetas with basic filters', async () => {
      const mockResult = {
        rows: [{ id: 1, nombre: 'Visa' }],
        count: 1
      };
      mockTarjeta.findAndCountAll.mockResolvedValue(mockResult);

      const filters = { tipo: 'credito' };
      const result = await tarjetaService.getWithFilters(filters, 1);

      expect(mockTarjeta.findAndCountAll).toHaveBeenCalledWith({
        where: {
          usuario_id: 1,
          tipo: 'credito'
        },
        order: [['nombre', 'ASC']]
      });

      expect(result).toEqual({
        data: mockResult.rows,
        meta: {
          total: 1,
          count: 1,
          offset: 0,
          limit: 1
        }
      });
    });

    test('should apply pagination when limit provided', async () => {
      const mockResult = {
        rows: [{ id: 1, nombre: 'Visa' }],
        count: 10
      };
      mockTarjeta.findAndCountAll.mockResolvedValue(mockResult);

      const filters = { limit: 5, offset: 10 };
      await tarjetaService.getWithFilters(filters, 1);

      expect(mockTarjeta.findAndCountAll).toHaveBeenCalledWith({
        where: { usuario_id: 1 },
        order: [['nombre', 'ASC']],
        limit: 5,
        offset: 10
      });
    });

    test('should filter by banco with case insensitive search', async () => {
      const mockResult = { rows: [], count: 0 };
      mockTarjeta.findAndCountAll.mockResolvedValue(mockResult);

      const filters = { banco: 'Nacion' };
      await tarjetaService.getWithFilters(filters, 1);

      expect(mockTarjeta.findAndCountAll).toHaveBeenCalledWith({
        where: {
          usuario_id: 1,
          banco: { [Op.iLike]: '%Nacion%' }
        },
        order: [['nombre', 'ASC']]
      });
    });

    test('should filter by permite_cuotas boolean', async () => {
      const mockResult = { rows: [], count: 0 };
      mockTarjeta.findAndCountAll.mockResolvedValue(mockResult);

      const filters = { permite_cuotas: 'true' };
      await tarjetaService.getWithFilters(filters, 1);

      expect(mockTarjeta.findAndCountAll).toHaveBeenCalledWith({
        where: {
          usuario_id: 1,
          permite_cuotas: true
        },
        order: [['nombre', 'ASC']]
      });
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockTarjeta.findAndCountAll.mockRejectedValue(error);

      await expect(tarjetaService.getWithFilters({}, 1)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener tarjetas con filtros:',
        { error, filters: {}, userId: 1 }
      );
    });
  });

  describe('isOwner', () => {
    test('should return true when user owns tarjeta', async () => {
      mockTarjeta.findOne.mockResolvedValue({ id: 1, usuario_id: 1 });

      const result = await tarjetaService.isOwner(1, 1);

      expect(result).toBe(true);
    });

    test('should return false when user does not own tarjeta', async () => {
      mockTarjeta.findOne.mockResolvedValue(null);

      const result = await tarjetaService.isOwner(1, 2);

      expect(result).toBe(false);
    });

    test('should return false on database error', async () => {
      const error = new Error('Database error');
      mockTarjeta.findOne.mockRejectedValue(error);

      const result = await tarjetaService.isOwner(1, 1);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al verificar ownership de tarjeta:',
        { error, tarjetaId: 1, userId: 1 }
      );
    });
  });

  describe('getUserCardStats', () => {
    test('should return correct statistics', async () => {
      mockTarjeta.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // credito
        .mockResolvedValueOnce(1); // debito

      const result = await tarjetaService.getUserCardStats(1);

      expect(result).toEqual({
        total: 5,
        credito: 2,
        debito: 1,
        virtual: 2
      });

      expect(mockTarjeta.count).toHaveBeenCalledTimes(3);
      expect(mockTarjeta.count).toHaveBeenNthCalledWith(1, { where: { usuario_id: 1 } });
      expect(mockTarjeta.count).toHaveBeenNthCalledWith(2, { where: { usuario_id: 1, tipo: 'credito' } });
      expect(mockTarjeta.count).toHaveBeenNthCalledWith(3, { where: { usuario_id: 1, tipo: 'debito' } });
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockTarjeta.count.mockRejectedValue(error);

      await expect(tarjetaService.getUserCardStats(1)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener estadísticas de tarjetas:',
        { error, userId: 1 }
      );
    });
  });
});