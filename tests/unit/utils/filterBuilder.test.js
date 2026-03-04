import { describe, it, expect, beforeEach } from '@jest/globals';
import { Op } from 'sequelize';
import { FilterBuilder, buildQueryOptions, buildPagination } from '../../../src/utils/filterBuilder.js';

describe('FilterBuilder', () => {
  describe('constructor', () => {
    it('should initialize with empty where object when no userId', () => {
      const builder = new FilterBuilder();
      expect(builder.build()).toEqual({});
    });

    it('should initialize with usuario_id when userId provided', () => {
      const builder = new FilterBuilder(123);
      expect(builder.build()).toEqual({ usuario_id: 123 });
    });
  });

  describe('addEquals', () => {
    it('should add field when value is provided', () => {
      const builder = new FilterBuilder();
      builder.addEquals('categoria_id', 5);
      expect(builder.build()).toEqual({ categoria_id: 5 });
    });

    it('should not add field when value is undefined', () => {
      const builder = new FilterBuilder();
      builder.addEquals('categoria_id', undefined);
      expect(builder.build()).toEqual({});
    });

    it('should not add field when value is null', () => {
      const builder = new FilterBuilder();
      builder.addEquals('categoria_id', null);
      expect(builder.build()).toEqual({});
    });

    it('should not add field when value is empty string', () => {
      const builder = new FilterBuilder();
      builder.addEquals('categoria_id', '');
      expect(builder.build()).toEqual({});
    });

    it('should allow chaining', () => {
      const builder = new FilterBuilder();
      const result = builder.addEquals('field1', 'value1');
      expect(result).toBe(builder);
    });
  });

  describe('addBoolean', () => {
    it('should convert string "true" to boolean true', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', 'true');
      expect(builder.build()).toEqual({ activo: true });
    });

    it('should convert string "false" to boolean false', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', 'false');
      expect(builder.build()).toEqual({ activo: false });
    });

    it('should keep boolean true as true', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', true);
      expect(builder.build()).toEqual({ activo: true });
    });

    it('should keep boolean false as false', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', false);
      expect(builder.build()).toEqual({ activo: false });
    });

    it('should not add field when value is undefined', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', undefined);
      expect(builder.build()).toEqual({});
    });

    it('should not add field when value is empty string', () => {
      const builder = new FilterBuilder();
      builder.addBoolean('activo', '');
      expect(builder.build()).toEqual({});
    });
  });

  describe('addDateRange', () => {
    it('should add gte operator when desde is provided', () => {
      const builder = new FilterBuilder();
      builder.addDateRange('fecha', '2024-01-01', null);
      const result = builder.build();
      expect(result.fecha).toBeDefined();
      expect(result.fecha[Op.gte]).toBe('2024-01-01');
      expect(result.fecha[Op.lte]).toBeUndefined();
    });

    it('should add lte operator when hasta is provided', () => {
      const builder = new FilterBuilder();
      builder.addDateRange('fecha', null, '2024-12-31');
      const result = builder.build();
      expect(result.fecha).toBeDefined();
      expect(result.fecha[Op.lte]).toBe('2024-12-31');
      expect(result.fecha[Op.gte]).toBeUndefined();
    });

    it('should add both operators when both dates provided', () => {
      const builder = new FilterBuilder();
      builder.addDateRange('fecha', '2024-01-01', '2024-12-31');
      const result = builder.build();
      expect(result.fecha).toBeDefined();
      expect(result.fecha[Op.gte]).toBe('2024-01-01');
      expect(result.fecha[Op.lte]).toBe('2024-12-31');
    });

    it('should not add field when both values are null', () => {
      const builder = new FilterBuilder();
      builder.addDateRange('fecha', null, null);
      expect(builder.build()).toEqual({});
    });
  });

  describe('addNumberRange', () => {
    it('should add gte operator when min is provided', () => {
      const builder = new FilterBuilder();
      builder.addNumberRange('monto', 100, undefined);
      const result = builder.build();
      expect(result.monto).toBeDefined();
    });

    it('should add lte operator when max is provided', () => {
      const builder = new FilterBuilder();
      builder.addNumberRange('monto', undefined, 1000);
      const result = builder.build();
      expect(result.monto).toBeDefined();
    });

    it('should convert string numbers to numbers', () => {
      const builder = new FilterBuilder();
      builder.addNumberRange('monto', '100', '1000');
      const result = builder.build();
      expect(result.monto).toBeDefined();
    });

    it('should not add field when both values are undefined', () => {
      const builder = new FilterBuilder();
      builder.addNumberRange('monto', undefined, undefined);
      expect(builder.build()).toEqual({});
    });

    it('should not add field when both values are empty strings', () => {
      const builder = new FilterBuilder();
      builder.addNumberRange('monto', '', '');
      expect(builder.build()).toEqual({});
    });
  });

  describe('addOptionalIds', () => {
    it('should add multiple IDs when provided', () => {
      const builder = new FilterBuilder();
      builder.addOptionalIds({
        categoria_id: 1,
        tipo_id: 2,
        tarjeta_id: 3
      });
      expect(builder.build()).toEqual({
        categoria_id: 1,
        tipo_id: 2,
        tarjeta_id: 3
      });
    });

    it('should skip undefined values', () => {
      const builder = new FilterBuilder();
      builder.addOptionalIds({
        categoria_id: 1,
        tipo_id: undefined,
        tarjeta_id: null
      });
      expect(builder.build()).toEqual({ categoria_id: 1 });
    });

    it('should handle empty object', () => {
      const builder = new FilterBuilder();
      builder.addOptionalIds({});
      expect(builder.build()).toEqual({});
    });
  });

  describe('addLike', () => {
    it('should add iLike operator for text search', () => {
      const builder = new FilterBuilder();
      builder.addLike('descripcion', 'test');
      const result = builder.build();
      expect(result.descripcion).toBeDefined();
    });

    it('should not add field when value is empty', () => {
      const builder = new FilterBuilder();
      builder.addLike('descripcion', '');
      expect(builder.build()).toEqual({});
    });
  });

  describe('chaining', () => {
    it('should allow chaining multiple methods', () => {
      const result = new FilterBuilder(1)
        .addEquals('categoria_id', 5)
        .addBoolean('activo', true)
        .addDateRange('fecha', '2024-01-01', '2024-12-31')
        .addNumberRange('monto', 100, 1000)
        .build();

      expect(result.usuario_id).toBe(1);
      expect(result.categoria_id).toBe(5);
      expect(result.activo).toBe(true);
      expect(result.fecha).toBeDefined();
      expect(result.monto).toBeDefined();
    });
  });
});

describe('buildQueryOptions', () => {
  it('should build basic query options', () => {
    const options = buildQueryOptions({
      where: { usuario_id: 1 },
      includes: [{ model: 'Test' }],
      orderBy: 'fecha',
      orderDirection: 'DESC'
    });

    expect(options.where).toEqual({ usuario_id: 1 });
    expect(options.include).toEqual([{ model: 'Test' }]);
    expect(options.order).toEqual([['fecha', 'DESC']]);
  });

  it('should add limit and offset when provided', () => {
    const options = buildQueryOptions({
      where: {},
      includes: [],
      limit: 10,
      offset: 20
    });

    expect(options.limit).toBe(10);
    expect(options.offset).toBe(20);
  });

  it('should not add limit and offset when limit is not provided', () => {
    const options = buildQueryOptions({
      where: {},
      includes: []
    });

    expect(options.limit).toBeUndefined();
    expect(options.offset).toBeUndefined();
  });

  it('should convert string limit and offset to numbers', () => {
    const options = buildQueryOptions({
      where: {},
      includes: [],
      limit: '10',
      offset: '20'
    });

    expect(options.limit).toBe(10);
    expect(options.offset).toBe(20);
  });

  it('should uppercase order direction', () => {
    const options = buildQueryOptions({
      where: {},
      includes: [],
      orderDirection: 'asc'
    });

    expect(options.order[0][1]).toBe('ASC');
  });
});

describe('buildPagination', () => {
  it('should build pagination object', () => {
    const pagination = buildPagination(100, 10, 0);

    expect(pagination.total).toBe(100);
    expect(pagination.limit).toBe(10);
    expect(pagination.offset).toBe(0);
    expect(pagination.hasNext).toBe(true);
    expect(pagination.hasPrev).toBe(false);
  });

  it('should set hasNext to false when on last page', () => {
    const pagination = buildPagination(100, 10, 90);

    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrev).toBe(true);
  });

  it('should set hasPrev to true when offset > 0', () => {
    const pagination = buildPagination(100, 10, 10);

    expect(pagination.hasPrev).toBe(true);
  });

  it('should handle string inputs', () => {
    const pagination = buildPagination(100, '10', '20');

    expect(pagination.limit).toBe(10);
    expect(pagination.offset).toBe(20);
  });

  it('should handle exact page boundary', () => {
    const pagination = buildPagination(50, 10, 40);

    expect(pagination.hasNext).toBe(false);
  });
});
