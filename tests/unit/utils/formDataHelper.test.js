import { describe, it, expect } from '@jest/globals';
import { cleanFormData, cleanEntityFormData, FORM_CONFIGS } from '../../../src/utils/formDataHelper.js';

describe('cleanFormData', () => {
  describe('nullableFields', () => {
    it('should convert empty string to null', () => {
      const result = cleanFormData(
        { tarjeta_id: '' },
        { nullableFields: ['tarjeta_id'] }
      );
      expect(result.tarjeta_id).toBeNull();
    });

    it('should convert undefined to null', () => {
      const result = cleanFormData(
        { tarjeta_id: undefined },
        { nullableFields: ['tarjeta_id'] }
      );
      expect(result.tarjeta_id).toBeNull();
    });

    it('should keep valid values unchanged', () => {
      const result = cleanFormData(
        { tarjeta_id: 5 },
        { nullableFields: ['tarjeta_id'] }
      );
      expect(result.tarjeta_id).toBe(5);
    });
  });

  describe('numericFields', () => {
    it('should convert string to float', () => {
      const result = cleanFormData(
        { monto: '100.50' },
        { numericFields: ['monto'] }
      );
      expect(result.monto).toBe(100.50);
    });

    it('should keep number as number', () => {
      const result = cleanFormData(
        { monto: 100.50 },
        { numericFields: ['monto'] }
      );
      expect(result.monto).toBe(100.50);
    });

    it('should not convert empty string', () => {
      const result = cleanFormData(
        { monto: '' },
        { numericFields: ['monto'] }
      );
      expect(result.monto).toBe('');
    });

    it('should not convert null', () => {
      const result = cleanFormData(
        { monto: null },
        { numericFields: ['monto'] }
      );
      expect(result.monto).toBeNull();
    });
  });

  describe('integerFields', () => {
    it('should convert string to integer', () => {
      const result = cleanFormData(
        { cantidad: '10' },
        { integerFields: ['cantidad'] }
      );
      expect(result.cantidad).toBe(10);
    });

    it('should truncate decimal values', () => {
      const result = cleanFormData(
        { cantidad: '10.9' },
        { integerFields: ['cantidad'] }
      );
      expect(result.cantidad).toBe(10);
    });

    it('should keep integer as integer', () => {
      const result = cleanFormData(
        { cantidad: 10 },
        { integerFields: ['cantidad'] }
      );
      expect(result.cantidad).toBe(10);
    });
  });

  describe('booleanFields', () => {
    it('should convert "on" to true', () => {
      const result = cleanFormData(
        { activo: 'on' },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(true);
    });

    it('should convert "true" to true', () => {
      const result = cleanFormData(
        { activo: 'true' },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(true);
    });

    it('should keep true as true', () => {
      const result = cleanFormData(
        { activo: true },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(true);
    });

    it('should convert "off" to false', () => {
      const result = cleanFormData(
        { activo: 'off' },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(false);
    });

    it('should convert "false" to false', () => {
      const result = cleanFormData(
        { activo: 'false' },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(false);
    });

    it('should convert empty string to false', () => {
      const result = cleanFormData(
        { activo: '' },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(false);
    });

    it('should convert undefined to false', () => {
      const result = cleanFormData(
        { activo: undefined },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(false);
    });

    it('should keep false as false', () => {
      const result = cleanFormData(
        { activo: false },
        { booleanFields: ['activo'] }
      );
      expect(result.activo).toBe(false);
    });
  });

  describe('combined config', () => {
    it('should handle multiple field types', () => {
      const result = cleanFormData(
        {
          monto: '100.50',
          cantidad: '5',
          tarjeta_id: '',
          activo: 'on',
          descripcion: 'Test'
        },
        {
          numericFields: ['monto'],
          integerFields: ['cantidad'],
          nullableFields: ['tarjeta_id'],
          booleanFields: ['activo']
        }
      );

      expect(result.monto).toBe(100.50);
      expect(result.cantidad).toBe(5);
      expect(result.tarjeta_id).toBeNull();
      expect(result.activo).toBe(true);
      expect(result.descripcion).toBe('Test');
    });

    it('should not mutate original object', () => {
      const original = { monto: '100' };
      cleanFormData(original, { numericFields: ['monto'] });
      expect(original.monto).toBe('100');
    });
  });

  describe('default config', () => {
    it('should work with empty config', () => {
      const result = cleanFormData({ field: 'value' });
      expect(result.field).toBe('value');
    });

    it('should work with undefined config', () => {
      const result = cleanFormData({ field: 'value' }, undefined);
      expect(result.field).toBe('value');
    });
  });
});

describe('FORM_CONFIGS', () => {
  it('should have config for compra', () => {
    expect(FORM_CONFIGS.compra).toBeDefined();
    expect(FORM_CONFIGS.compra.numericFields).toContain('monto_total');
    expect(FORM_CONFIGS.compra.integerFields).toContain('cantidad_cuotas');
    expect(FORM_CONFIGS.compra.nullableFields).toContain('tarjeta_id');
    expect(FORM_CONFIGS.compra.booleanFields).toContain('pendiente_cuotas');
  });

  it('should have config for debitoAutomatico', () => {
    expect(FORM_CONFIGS.debitoAutomatico).toBeDefined();
    expect(FORM_CONFIGS.debitoAutomatico.numericFields).toContain('monto');
    expect(FORM_CONFIGS.debitoAutomatico.integerFields).toContain('dia_de_pago');
    expect(FORM_CONFIGS.debitoAutomatico.nullableFields).toContain('tarjeta_id');
    expect(FORM_CONFIGS.debitoAutomatico.booleanFields).toContain('activo');
  });

  it('should have config for gastoRecurrente', () => {
    expect(FORM_CONFIGS.gastoRecurrente).toBeDefined();
    expect(FORM_CONFIGS.gastoRecurrente.numericFields).toContain('monto');
    expect(FORM_CONFIGS.gastoRecurrente.booleanFields).toContain('activo');
  });

  it('should have config for gastoUnico', () => {
    expect(FORM_CONFIGS.gastoUnico).toBeDefined();
    expect(FORM_CONFIGS.gastoUnico.numericFields).toContain('monto');
    expect(FORM_CONFIGS.gastoUnico.booleanFields).toContain('procesado');
  });

  it('should have config for ingresoRecurrente', () => {
    expect(FORM_CONFIGS.ingresoRecurrente).toBeDefined();
    expect(FORM_CONFIGS.ingresoRecurrente.numericFields).toContain('monto');
    expect(FORM_CONFIGS.ingresoRecurrente.booleanFields).toContain('activo');
  });

  it('should have config for ingresoUnico', () => {
    expect(FORM_CONFIGS.ingresoUnico).toBeDefined();
    expect(FORM_CONFIGS.ingresoUnico.numericFields).toContain('monto');
  });

  it('should have config for tarjeta', () => {
    expect(FORM_CONFIGS.tarjeta).toBeDefined();
    expect(FORM_CONFIGS.tarjeta.integerFields).toContain('dia_cierre');
    expect(FORM_CONFIGS.tarjeta.integerFields).toContain('dia_vencimiento');
    expect(FORM_CONFIGS.tarjeta.booleanFields).toContain('activa');
  });
});

describe('cleanEntityFormData', () => {
  it('should clean compra data correctly', () => {
    const result = cleanEntityFormData({
      monto_total: '1000.50',
      cantidad_cuotas: '12',
      tarjeta_id: '',
      pendiente_cuotas: 'on',
      descripcion: 'Test compra'
    }, 'compra');

    expect(result.monto_total).toBe(1000.50);
    expect(result.cantidad_cuotas).toBe(12);
    expect(result.tarjeta_id).toBeNull();
    expect(result.pendiente_cuotas).toBe(true);
    expect(result.descripcion).toBe('Test compra');
  });

  it('should clean debitoAutomatico data correctly', () => {
    const result = cleanEntityFormData({
      monto: '500',
      dia_de_pago: '15',
      mes_de_pago: '',
      activo: 'true',
      tarjeta_id: '3'
    }, 'debitoAutomatico');

    expect(result.monto).toBe(500);
    expect(result.dia_de_pago).toBe(15);
    expect(result.mes_de_pago).toBeNull();
    expect(result.activo).toBe(true);
    expect(result.tarjeta_id).toBe(3);
  });

  it('should throw error for unknown entity type', () => {
    expect(() => {
      cleanEntityFormData({}, 'unknownEntity');
    }).toThrow('No existe configuración de formulario para: unknownEntity');
  });
});
