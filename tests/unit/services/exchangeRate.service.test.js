import { jest } from '@jest/globals';

/**
 * Unit tests for ExchangeRateService
 * Tests currency conversion, rate fetching, and caching logic
 */

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockTipoCambio = {
  findOne: jest.fn(),
  findAll: jest.fn(),
  upsert: jest.fn(),
  create: jest.fn()
};

const mockAxios = {
  get: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  TipoCambio: mockTipoCambio
}));

jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

// Import service after mocking
const { ExchangeRateService } = await import('../../../src/services/exchangeRate.service.js');

describe('ExchangeRateService', () => {
  const mockExchangeRate = {
    fecha: '2026-01-26',
    valor_compra_usd_ars: 1470.00,
    valor_venta_usd_ars: 1490.00,
    fuente: 'api_dolar_api',
    activo: true,
    update: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    ExchangeRateService.invalidateCache();
  });

  describe('Currency Conversion', () => {
    describe('convertARStoUSD', () => {
      test('should convert ARS to USD using venta rate by default', () => {
        const montoARS = 1490;
        const result = ExchangeRateService.convertARStoUSD(montoARS, mockExchangeRate);

        expect(result).toBe(1.00); // 1490 / 1490 = 1
      });

      test('should convert ARS to USD using compra rate when specified', () => {
        const montoARS = 1470;
        const result = ExchangeRateService.convertARStoUSD(montoARS, mockExchangeRate, 'compra');

        expect(result).toBe(1.00); // 1470 / 1470 = 1
      });

      test('should handle decimal amounts correctly', () => {
        const montoARS = 14900;
        const result = ExchangeRateService.convertARStoUSD(montoARS, mockExchangeRate);

        expect(result).toBe(10.00); // 14900 / 1490 = 10
      });

      test('should round to 2 decimal places', () => {
        const montoARS = 1000;
        const result = ExchangeRateService.convertARStoUSD(montoARS, mockExchangeRate);

        expect(result).toBe(0.67); // 1000 / 1490 ≈ 0.67
      });

      test('should throw error for zero exchange rate', () => {
        const zeroRate = { valor_venta_usd_ars: 0, valor_compra_usd_ars: 0 };

        expect(() => ExchangeRateService.convertARStoUSD(1000, zeroRate))
          .toThrow('Tipo de cambio inválido: el valor debe ser mayor a cero');
      });

      test('should throw error for negative exchange rate', () => {
        const negativeRate = { valor_venta_usd_ars: -100, valor_compra_usd_ars: -100 };

        expect(() => ExchangeRateService.convertARStoUSD(1000, negativeRate))
          .toThrow('Tipo de cambio inválido: el valor debe ser mayor a cero');
      });
    });

    describe('convertUSDtoARS', () => {
      test('should convert USD to ARS using compra rate by default', () => {
        const montoUSD = 1;
        const result = ExchangeRateService.convertUSDtoARS(montoUSD, mockExchangeRate);

        expect(result).toBe(1470.00); // 1 * 1470 = 1470
      });

      test('should convert USD to ARS using venta rate when specified', () => {
        const montoUSD = 1;
        const result = ExchangeRateService.convertUSDtoARS(montoUSD, mockExchangeRate, 'venta');

        expect(result).toBe(1490.00); // 1 * 1490 = 1490
      });

      test('should handle larger amounts correctly', () => {
        const montoUSD = 100;
        const result = ExchangeRateService.convertUSDtoARS(montoUSD, mockExchangeRate);

        expect(result).toBe(147000.00); // 100 * 1470 = 147000
      });

      test('should throw error for zero exchange rate', () => {
        const zeroRate = { valor_venta_usd_ars: 0, valor_compra_usd_ars: 0 };

        expect(() => ExchangeRateService.convertUSDtoARS(100, zeroRate))
          .toThrow('Tipo de cambio inválido: el valor debe ser mayor a cero');
      });
    });

    describe('calculateBothCurrencies', () => {
      beforeEach(() => {
        mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);
      });

      test('should calculate both currencies from ARS origin', async () => {
        const result = await ExchangeRateService.calculateBothCurrencies(
          1490,
          'ARS',
          mockExchangeRate
        );

        expect(result.monto_ars).toBe(1490);
        expect(result.monto_usd).toBe(1.00);
        expect(result.tipo_cambio_usado).toBe(1490.00);
      });

      test('should calculate both currencies from USD origin', async () => {
        const result = await ExchangeRateService.calculateBothCurrencies(
          100,
          'USD',
          mockExchangeRate
        );

        expect(result.monto_usd).toBe(100);
        expect(result.monto_ars).toBe(147000.00);
        expect(result.tipo_cambio_usado).toBe(1470.00); // USD→ARS usa valor de compra
      });

      test('should throw error for invalid currency', async () => {
        await expect(
          ExchangeRateService.calculateBothCurrencies(100, 'EUR', mockExchangeRate)
        ).rejects.toThrow('Moneda origen inválida: EUR');
      });

      test('should fetch current rate if not provided', async () => {
        mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);

        const result = await ExchangeRateService.calculateBothCurrencies(1490, 'ARS');

        expect(mockTipoCambio.findOne).toHaveBeenCalled();
        expect(result.monto_ars).toBe(1490);
        expect(result.monto_usd).toBe(1.00);
      });
    });
  });

  describe('getCurrentRate', () => {
    test('should return current rate from database', async () => {
      mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);

      const result = await ExchangeRateService.getCurrentRate();

      expect(result).toEqual(mockExchangeRate);
      expect(mockTipoCambio.findOne).toHaveBeenCalledWith({
        where: { activo: true },
        order: [['fecha', 'DESC']]
      });
    });

    test('should throw error when no rate configured', async () => {
      mockTipoCambio.findOne.mockResolvedValue(null);

      await expect(ExchangeRateService.getCurrentRate())
        .rejects.toThrow('No hay tipo de cambio configurado en el sistema');
    });

    test('should use cache on subsequent calls', async () => {
      mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);

      // First call - should hit database
      await ExchangeRateService.getCurrentRate();
      expect(mockTipoCambio.findOne).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await ExchangeRateService.getCurrentRate();
      expect(mockTipoCambio.findOne).toHaveBeenCalledTimes(1);
    });

    test('should refresh cache after invalidation', async () => {
      mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);

      await ExchangeRateService.getCurrentRate();
      ExchangeRateService.invalidateCache();
      await ExchangeRateService.getCurrentRate();

      expect(mockTipoCambio.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('setManualRate', () => {
    test('should create manual rate with valid values', async () => {
      const fecha = '2026-01-26';
      const valorCompra = 1470;
      const valorVenta = 1490;

      mockTipoCambio.upsert.mockResolvedValue([{
        fecha,
        valor_compra_usd_ars: valorCompra,
        valor_venta_usd_ars: valorVenta,
        fuente: 'manual',
        activo: true
      }, true]);

      const result = await ExchangeRateService.setManualRate(fecha, valorCompra, valorVenta);

      expect(result.fuente).toBe('manual');
      expect(mockTipoCambio.upsert).toHaveBeenCalled();
    });

    test('should throw error when venta < compra', async () => {
      await expect(
        ExchangeRateService.setManualRate('2026-01-26', 1500, 1400)
      ).rejects.toThrow('El valor de venta debe ser mayor o igual al valor de compra');
    });

    test('should throw error when values are zero or negative', async () => {
      await expect(
        ExchangeRateService.setManualRate('2026-01-26', 0, 1490)
      ).rejects.toThrow('Los valores deben ser mayores a cero');

      await expect(
        ExchangeRateService.setManualRate('2026-01-26', -100, 1490)
      ).rejects.toThrow('Los valores deben ser mayores a cero');
    });
  });

  describe('updateFromDolarAPI', () => {
    test('should fetch and save rate from DolarAPI', async () => {
      const apiResponse = {
        data: {
          compra: 1470,
          venta: 1490
        }
      };

      mockAxios.get.mockResolvedValue(apiResponse);
      mockTipoCambio.findOne.mockResolvedValue(null); // No existing rate
      mockTipoCambio.upsert.mockResolvedValue([{
        ...mockExchangeRate,
        update: jest.fn().mockResolvedValue(mockExchangeRate)
      }, true]);

      const result = await ExchangeRateService.updateFromDolarAPI();

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://dolarapi.com/v1/dolares/blue',
        { timeout: 10000 }
      );
      expect(result).toBeTruthy();
    });

    test('should return existing rate if already updated today', async () => {
      mockTipoCambio.findOne.mockResolvedValue({
        ...mockExchangeRate,
        fuente: 'api_dolar_api' // Not manual
      });

      const result = await ExchangeRateService.updateFromDolarAPI();

      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(result.fuente).toBe('api_dolar_api');
    });

    test('should return null on API error', async () => {
      mockTipoCambio.findOne.mockResolvedValue(null);
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await ExchangeRateService.updateFromDolarAPI();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    test('should have 1-hour TTL', () => {
      expect(ExchangeRateService.cache.TTL).toBe(1000 * 60 * 60);
    });

    test('should invalidate cache correctly', () => {
      ExchangeRateService.cache.current = mockExchangeRate;
      ExchangeRateService.cache.lastUpdate = Date.now();

      ExchangeRateService.invalidateCache();

      expect(ExchangeRateService.cache.current).toBeNull();
      expect(ExchangeRateService.cache.lastUpdate).toBeNull();
    });

    test('should detect expired cache', () => {
      ExchangeRateService.cache.current = mockExchangeRate;
      // Set lastUpdate to 2 hours ago
      ExchangeRateService.cache.lastUpdate = Date.now() - (2 * 60 * 60 * 1000);

      expect(ExchangeRateService.isCacheValid()).toBe(false);
    });

    test('should detect valid cache', () => {
      ExchangeRateService.cache.current = mockExchangeRate;
      ExchangeRateService.cache.lastUpdate = Date.now();

      expect(ExchangeRateService.isCacheValid()).toBe(true);
    });
  });

  describe('getRateForDate', () => {
    test('should return exact rate for date', async () => {
      mockTipoCambio.findOne.mockResolvedValue(mockExchangeRate);

      const result = await ExchangeRateService.getRateForDate('2026-01-26');

      expect(result).toEqual(mockExchangeRate);
    });

    test('should fallback to closest previous rate', async () => {
      const olderRate = { ...mockExchangeRate, fecha: '2026-01-20' };

      // First call: no exact match
      mockTipoCambio.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(olderRate);

      const result = await ExchangeRateService.getRateForDate('2026-01-26');

      expect(result.fecha).toBe('2026-01-20');
    });
  });
});
