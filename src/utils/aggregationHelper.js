import { Op } from 'sequelize';

/**
 * Helper para construir resúmenes y agregaciones de datos financieros
 */

/**
 * Calcula el período de fechas (por defecto mes actual)
 * @param {string} fechaDesde - Fecha desde (opcional)
 * @param {string} fechaHasta - Fecha hasta (opcional)
 * @returns {{ desde: string, hasta: string }}
 */
export function calcularPeriodo(fechaDesde, fechaHasta) {
  if (fechaDesde && fechaHasta) {
    return { desde: fechaDesde, hasta: fechaHasta };
  }

  // Por defecto, mes actual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    desde: firstDay.toISOString().split('T')[0],
    hasta: lastDay.toISOString().split('T')[0]
  };
}

/**
 * Construye cláusula WHERE con filtro de fechas
 * @param {number} userId - ID del usuario
 * @param {string} fechaDesde - Fecha desde
 * @param {string} fechaHasta - Fecha hasta
 * @param {string} fechaField - Nombre del campo de fecha (default: 'fecha')
 * @returns {Object} - Cláusula WHERE para Sequelize
 */
export function buildDateRangeWhere(userId, fechaDesde, fechaHasta, fechaField = 'fecha') {
  const periodo = calcularPeriodo(fechaDesde, fechaHasta);

  return {
    usuario_id: userId,
    [fechaField]: {
      [Op.between]: [periodo.desde, periodo.hasta]
    }
  };
}

/**
 * Agrupa y suma montos por una clave específica
 * @param {Array} items - Array de gastos/ingresos
 * @param {Function} keyExtractor - Función que extrae la clave de agrupación
 * @param {string} defaultKey - Clave por defecto si no existe
 * @returns {Object} - Agrupación con totales
 */
export function agruparPorClave(items, keyExtractor, defaultKey = 'Sin clasificar') {
  const grupos = {};

  for (const item of items) {
    const key = keyExtractor(item) || defaultKey;
    const montoArs = parseFloat(item.monto_ars) || 0;
    const montoUsd = parseFloat(item.monto_usd) || 0;

    if (!grupos[key]) {
      grupos[key] = { total_ars: 0, total_usd: 0, cantidad: 0 };
    }

    grupos[key].total_ars += montoArs;
    grupos[key].total_usd += montoUsd;
    grupos[key].cantidad++;
  }

  return grupos;
}

/**
 * Calcula totales generales de un array de items
 * @param {Array} items - Array de gastos/ingresos
 * @returns {{ total_ars: number, total_usd: number, cantidad: number }}
 */
export function calcularTotales(items) {
  let total_ars = 0;
  let total_usd = 0;

  for (const item of items) {
    total_ars += parseFloat(item.monto_ars) || 0;
    total_usd += parseFloat(item.monto_usd) || 0;
  }

  return {
    total_ars,
    total_usd,
    cantidad: items.length
  };
}

/**
 * Construye un resumen completo de gastos/ingresos
 * @param {Array} items - Array de gastos/ingresos
 * @param {string} fechaDesde - Fecha desde
 * @param {string} fechaHasta - Fecha hasta
 * @param {Object} agrupaciones - Configuración de agrupaciones
 * @returns {Object} - Resumen completo
 */
export function buildResumen(items, fechaDesde, fechaHasta, agrupaciones = {}) {
  const periodo = calcularPeriodo(fechaDesde, fechaHasta);
  const totales = calcularTotales(items);

  const resumen = {
    periodo,
    total_ars: totales.total_ars,
    total_usd: totales.total_usd,
    cantidad_gastos: totales.cantidad
  };

  // Agregar agrupaciones configuradas
  for (const [nombreGrupo, { extractor, defaultKey }] of Object.entries(agrupaciones)) {
    resumen[nombreGrupo] = agruparPorClave(items, extractor, defaultKey);
  }

  return resumen;
}

/**
 * Configuraciones predefinidas para resumen de gastos
 */
export const GASTOS_AGRUPACIONES = {
  por_categoria: {
    extractor: (g) => g.categoria?.nombre_categoria,
    defaultKey: 'Sin categoría'
  },
  por_importancia: {
    extractor: (g) => g.importancia?.nombre_importancia,
    defaultKey: 'Sin importancia'
  },
  por_tipo_pago: {
    extractor: (g) => g.tipoPago?.nombre,
    defaultKey: 'Sin tipo de pago'
  }
};

/**
 * Configuraciones predefinidas para resumen de ingresos
 */
export const INGRESOS_AGRUPACIONES = {
  por_fuente: {
    extractor: (i) => i.fuenteIngreso?.nombre,
    defaultKey: 'Sin fuente'
  }
};
