/**
 * Helper para limpiar y normalizar datos de formularios
 * Centraliza la lógica duplicada de cleanFormData en los controllers
 */

/**
 * Limpia y normaliza datos de formulario para su uso en la BD
 * @param {Object} body - Datos del request body
 * @param {Object} config - Configuración de campos
 * @param {Array<string>} config.numericFields - Campos que deben ser numéricos (parseFloat)
 * @param {Array<string>} config.integerFields - Campos que deben ser enteros (parseInt)
 * @param {Array<string>} config.nullableFields - Campos que pueden ser null si están vacíos
 * @param {Array<string>} config.booleanFields - Campos que son checkboxes/booleanos
 * @returns {Object} - Datos limpiados
 */
export function cleanFormData(body, config = {}) {
  const cleaned = { ...body };
  const {
    numericFields = [],
    integerFields = [],
    nullableFields = [],
    booleanFields = []
  } = config;

  // Convertir strings vacíos a null para campos opcionales/nullable
  for (const field of nullableFields) {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }

  // Asegurar tipos numéricos correctos (decimales)
  for (const field of numericFields) {
    if (cleaned[field] !== undefined && cleaned[field] !== null && cleaned[field] !== '') {
      cleaned[field] = parseFloat(cleaned[field]);
    }
  }

  // Asegurar tipos enteros correctos
  for (const field of integerFields) {
    if (cleaned[field] !== undefined && cleaned[field] !== null && cleaned[field] !== '') {
      cleaned[field] = parseInt(cleaned[field], 10);
    }
  }

  // Manejar checkboxes/booleanos
  for (const field of booleanFields) {
    if (cleaned[field] === 'on' || cleaned[field] === 'true' || cleaned[field] === true) {
      cleaned[field] = true;
    } else if (cleaned[field] === '' || cleaned[field] === undefined ||
               cleaned[field] === 'off' || cleaned[field] === 'false' || cleaned[field] === false) {
      cleaned[field] = false;
    }
  }

  return cleaned;
}

/**
 * Configuraciones predefinidas para cada tipo de entidad
 * Evita repetir la configuración en cada controller
 */
export const FORM_CONFIGS = {
  compra: {
    numericFields: ['monto_total'],
    integerFields: ['cantidad_cuotas', 'categoria_gasto_id', 'importancia_gasto_id', 'tipo_pago_id', 'tarjeta_id'],
    nullableFields: ['tarjeta_id'],
    booleanFields: ['pendiente_cuotas']
  },

  debitoAutomatico: {
    numericFields: ['monto'],
    integerFields: ['dia_de_pago', 'mes_de_pago', 'categoria_gasto_id', 'importancia_gasto_id', 'tipo_pago_id', 'frecuencia_gasto_id', 'tarjeta_id'],
    nullableFields: ['tarjeta_id', 'mes_de_pago', 'fecha_inicio', 'fecha_fin'],
    booleanFields: ['activo']
  },

  gastoRecurrente: {
    numericFields: ['monto'],
    integerFields: ['dia_de_pago', 'mes_de_pago', 'categoria_gasto_id', 'importancia_gasto_id', 'tipo_pago_id', 'frecuencia_gasto_id', 'tarjeta_id'],
    nullableFields: ['tarjeta_id', 'mes_de_pago', 'fecha_inicio', 'fecha_fin'],
    booleanFields: ['activo']
  },

  gastoUnico: {
    numericFields: ['monto'],
    integerFields: ['categoria_gasto_id', 'importancia_gasto_id', 'tipo_pago_id', 'tarjeta_id'],
    nullableFields: ['tarjeta_id'],
    booleanFields: ['procesado']
  },

  ingresoRecurrente: {
    numericFields: ['monto'],
    integerFields: ['dia_de_pago', 'mes_de_pago', 'frecuencia_gasto_id', 'fuente_ingreso_id'],
    nullableFields: ['mes_de_pago', 'fecha_inicio', 'fecha_fin', 'fuente_ingreso_id'],
    booleanFields: ['activo']
  },

  ingresoUnico: {
    numericFields: ['monto'],
    integerFields: ['fuente_ingreso_id'],
    nullableFields: ['fuente_ingreso_id'],
    booleanFields: []
  },

  tarjeta: {
    integerFields: ['dia_cierre', 'dia_vencimiento', 'banco_id', 'tipo_tarjeta_id'],
    nullableFields: ['banco_id', 'ultimos_4_digitos'],
    booleanFields: ['activa']
  }
};

/**
 * Función helper que usa la configuración predefinida
 * @param {Object} body - Datos del request body
 * @param {string} entityType - Tipo de entidad ('compra', 'debitoAutomatico', etc.)
 * @returns {Object} - Datos limpiados
 */
export function cleanEntityFormData(body, entityType) {
  const config = FORM_CONFIGS[entityType];
  if (!config) {
    throw new Error(`No existe configuración de formulario para: ${entityType}`);
  }
  return cleanFormData(body, config);
}
