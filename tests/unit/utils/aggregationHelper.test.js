import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calcularPeriodo,
  buildDateRangeWhere,
  agruparPorClave,
  calcularTotales,
  buildResumen,
  GASTOS_AGRUPACIONES,
  INGRESOS_AGRUPACIONES
} from '../../../src/utils/aggregationHelper.js';

describe('calcularPeriodo', () => {
  it('should return provided dates when both are given', () => {
    const result = calcularPeriodo('2024-01-01', '2024-12-31');
    expect(result.desde).toBe('2024-01-01');
    expect(result.hasta).toBe('2024-12-31');
  });

  it('should return current month when no dates provided', () => {
    const result = calcularPeriodo(null, null);
    const now = new Date();
    const expectedFirstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const expectedLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    expect(result.desde).toBe(expectedFirstDay);
    expect(result.hasta).toBe(expectedLastDay);
  });

  it('should return current month when dates are undefined', () => {
    const result = calcularPeriodo(undefined, undefined);
    expect(result.desde).toBeDefined();
    expect(result.hasta).toBeDefined();
  });
});

describe('buildDateRangeWhere', () => {
  it('should build where clause with usuario_id and fecha range', () => {
    const result = buildDateRangeWhere(123, '2024-01-01', '2024-12-31', 'fecha');

    expect(result.usuario_id).toBe(123);
    expect(result.fecha).toBeDefined();
  });

  it('should use default fecha field when not specified', () => {
    const result = buildDateRangeWhere(123, '2024-01-01', '2024-12-31');

    expect(result.fecha).toBeDefined();
  });

  it('should use current month when dates not provided', () => {
    const result = buildDateRangeWhere(123, null, null);

    expect(result.usuario_id).toBe(123);
    expect(result.fecha).toBeDefined();
  });

  it('should support custom date field name', () => {
    const result = buildDateRangeWhere(123, '2024-01-01', '2024-12-31', 'fecha_compra');

    expect(result.fecha_compra).toBeDefined();
    expect(result.fecha).toBeUndefined();
  });
});

describe('agruparPorClave', () => {
  const mockItems = [
    { monto_ars: '100.50', monto_usd: '10.05', categoria: { nombre_categoria: 'Comida' } },
    { monto_ars: '200.00', monto_usd: '20.00', categoria: { nombre_categoria: 'Comida' } },
    { monto_ars: '50.00', monto_usd: '5.00', categoria: { nombre_categoria: 'Transporte' } },
    { monto_ars: '75.00', monto_usd: null, categoria: null }
  ];

  it('should group items by key extractor', () => {
    const result = agruparPorClave(
      mockItems,
      (item) => item.categoria?.nombre_categoria,
      'Sin categoría'
    );

    expect(result['Comida']).toBeDefined();
    expect(result['Transporte']).toBeDefined();
    expect(result['Sin categoría']).toBeDefined();
  });

  it('should calculate correct totals for each group', () => {
    const result = agruparPorClave(
      mockItems,
      (item) => item.categoria?.nombre_categoria,
      'Sin categoría'
    );

    expect(result['Comida'].total_ars).toBe(300.50);
    expect(result['Comida'].total_usd).toBe(30.05);
    expect(result['Comida'].cantidad).toBe(2);

    expect(result['Transporte'].total_ars).toBe(50.00);
    expect(result['Transporte'].cantidad).toBe(1);
  });

  it('should use default key when extractor returns null', () => {
    const result = agruparPorClave(
      mockItems,
      (item) => item.categoria?.nombre_categoria,
      'Sin categoría'
    );

    expect(result['Sin categoría'].total_ars).toBe(75.00);
    expect(result['Sin categoría'].cantidad).toBe(1);
  });

  it('should handle null monto_usd', () => {
    const result = agruparPorClave(
      mockItems,
      (item) => item.categoria?.nombre_categoria,
      'Sin categoría'
    );

    expect(result['Sin categoría'].total_usd).toBe(0);
  });

  it('should handle empty array', () => {
    const result = agruparPorClave([], (item) => item.key, 'default');
    expect(result).toEqual({});
  });
});

describe('calcularTotales', () => {
  const mockItems = [
    { monto_ars: '100.50', monto_usd: '10.05' },
    { monto_ars: '200.00', monto_usd: '20.00' },
    { monto_ars: '50.00', monto_usd: null }
  ];

  it('should calculate total_ars correctly', () => {
    const result = calcularTotales(mockItems);
    expect(result.total_ars).toBe(350.50);
  });

  it('should calculate total_usd correctly, treating null as 0', () => {
    const result = calcularTotales(mockItems);
    expect(result.total_usd).toBe(30.05);
  });

  it('should return correct cantidad', () => {
    const result = calcularTotales(mockItems);
    expect(result.cantidad).toBe(3);
  });

  it('should handle empty array', () => {
    const result = calcularTotales([]);
    expect(result.total_ars).toBe(0);
    expect(result.total_usd).toBe(0);
    expect(result.cantidad).toBe(0);
  });

  it('should handle string amounts', () => {
    const items = [{ monto_ars: '100', monto_usd: '10' }];
    const result = calcularTotales(items);
    expect(result.total_ars).toBe(100);
    expect(result.total_usd).toBe(10);
  });
});

describe('buildResumen', () => {
  const mockGastos = [
    {
      monto_ars: '100.00',
      monto_usd: '10.00',
      categoria: { nombre_categoria: 'Comida' },
      importancia: { nombre_importancia: 'Necesario' },
      tipoPago: { nombre: 'Efectivo' }
    },
    {
      monto_ars: '200.00',
      monto_usd: '20.00',
      categoria: { nombre_categoria: 'Transporte' },
      importancia: { nombre_importancia: 'Necesario' },
      tipoPago: { nombre: 'Tarjeta' }
    }
  ];

  it('should build resumen with periodo', () => {
    const result = buildResumen(mockGastos, '2024-01-01', '2024-12-31', {});
    expect(result.periodo.desde).toBe('2024-01-01');
    expect(result.periodo.hasta).toBe('2024-12-31');
  });

  it('should calculate totals', () => {
    const result = buildResumen(mockGastos, '2024-01-01', '2024-12-31', {});
    expect(result.total_ars).toBe(300);
    expect(result.total_usd).toBe(30);
    expect(result.cantidad_gastos).toBe(2);
  });

  it('should include agrupaciones when provided', () => {
    const result = buildResumen(mockGastos, '2024-01-01', '2024-12-31', GASTOS_AGRUPACIONES);

    expect(result.por_categoria).toBeDefined();
    expect(result.por_categoria['Comida']).toBeDefined();
    expect(result.por_categoria['Transporte']).toBeDefined();

    expect(result.por_importancia).toBeDefined();
    expect(result.por_importancia['Necesario']).toBeDefined();

    expect(result.por_tipo_pago).toBeDefined();
    expect(result.por_tipo_pago['Efectivo']).toBeDefined();
    expect(result.por_tipo_pago['Tarjeta']).toBeDefined();
  });

  it('should handle empty items array', () => {
    const result = buildResumen([], '2024-01-01', '2024-12-31', GASTOS_AGRUPACIONES);
    expect(result.total_ars).toBe(0);
    expect(result.cantidad_gastos).toBe(0);
    expect(result.por_categoria).toEqual({});
  });
});

describe('GASTOS_AGRUPACIONES', () => {
  it('should have por_categoria config', () => {
    expect(GASTOS_AGRUPACIONES.por_categoria).toBeDefined();
    expect(GASTOS_AGRUPACIONES.por_categoria.extractor).toBeInstanceOf(Function);
    expect(GASTOS_AGRUPACIONES.por_categoria.defaultKey).toBe('Sin categoría');
  });

  it('should have por_importancia config', () => {
    expect(GASTOS_AGRUPACIONES.por_importancia).toBeDefined();
    expect(GASTOS_AGRUPACIONES.por_importancia.extractor).toBeInstanceOf(Function);
    expect(GASTOS_AGRUPACIONES.por_importancia.defaultKey).toBe('Sin importancia');
  });

  it('should have por_tipo_pago config', () => {
    expect(GASTOS_AGRUPACIONES.por_tipo_pago).toBeDefined();
    expect(GASTOS_AGRUPACIONES.por_tipo_pago.extractor).toBeInstanceOf(Function);
    expect(GASTOS_AGRUPACIONES.por_tipo_pago.defaultKey).toBe('Sin tipo de pago');
  });

  it('extractors should work correctly', () => {
    const mockGasto = {
      categoria: { nombre_categoria: 'Test Cat' },
      importancia: { nombre_importancia: 'Test Imp' },
      tipoPago: { nombre: 'Test Tipo' }
    };

    expect(GASTOS_AGRUPACIONES.por_categoria.extractor(mockGasto)).toBe('Test Cat');
    expect(GASTOS_AGRUPACIONES.por_importancia.extractor(mockGasto)).toBe('Test Imp');
    expect(GASTOS_AGRUPACIONES.por_tipo_pago.extractor(mockGasto)).toBe('Test Tipo');
  });
});

describe('INGRESOS_AGRUPACIONES', () => {
  it('should have por_fuente config', () => {
    expect(INGRESOS_AGRUPACIONES.por_fuente).toBeDefined();
    expect(INGRESOS_AGRUPACIONES.por_fuente.extractor).toBeInstanceOf(Function);
    expect(INGRESOS_AGRUPACIONES.por_fuente.defaultKey).toBe('Sin fuente');
  });

  it('extractor should work correctly', () => {
    const mockIngreso = {
      fuenteIngreso: { nombre: 'Sueldo' }
    };

    expect(INGRESOS_AGRUPACIONES.por_fuente.extractor(mockIngreso)).toBe('Sueldo');
  });
});
