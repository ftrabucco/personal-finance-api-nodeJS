import { Op } from 'sequelize';

/**
 * FilterBuilder: Clase utilitaria para construir filtros Sequelize de forma consistente
 * Elimina la duplicación de lógica de filtrado en los controllers
 */
export class FilterBuilder {
  constructor(userId) {
    this.where = {};
    if (userId) {
      this.where.usuario_id = userId;
    }
  }

  /**
   * Agrega un filtro de igualdad simple si el valor existe
   * @param {string} field - Nombre del campo en la BD
   * @param {*} value - Valor a filtrar
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addEquals(field, value) {
    if (value !== undefined && value !== null && value !== '') {
      this.where[field] = value;
    }
    return this;
  }

  /**
   * Agrega un filtro booleano (convierte strings 'true'/'false')
   * @param {string} field - Nombre del campo en la BD
   * @param {*} value - Valor a filtrar ('true', 'false', true, false)
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addBoolean(field, value) {
    if (value !== undefined && value !== null && value !== '') {
      this.where[field] = value === 'true' || value === true;
    }
    return this;
  }

  /**
   * Agrega un filtro de rango de fechas
   * @param {string} field - Nombre del campo de fecha en la BD
   * @param {string} desde - Fecha desde (inclusive)
   * @param {string} hasta - Fecha hasta (inclusive)
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addDateRange(field, desde, hasta) {
    if (desde || hasta) {
      this.where[field] = {};
      if (desde) this.where[field][Op.gte] = desde;
      if (hasta) this.where[field][Op.lte] = hasta;
    }
    return this;
  }

  /**
   * Agrega un filtro de rango numérico
   * @param {string} field - Nombre del campo numérico en la BD
   * @param {number|string} min - Valor mínimo (inclusive)
   * @param {number|string} max - Valor máximo (inclusive)
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addNumberRange(field, min, max) {
    if (min !== undefined || max !== undefined) {
      const hasMin = min !== undefined && min !== null && min !== '';
      const hasMax = max !== undefined && max !== null && max !== '';

      if (hasMin || hasMax) {
        this.where[field] = {};
        if (hasMin) this.where[field][Op.gte] = Number(min);
        if (hasMax) this.where[field][Op.lte] = Number(max);
      }
    }
    return this;
  }

  /**
   * Agrega múltiples filtros de IDs opcionales
   * @param {Object} idFilters - Objeto con { nombreCampo: valor }
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addOptionalIds(idFilters) {
    for (const [field, value] of Object.entries(idFilters)) {
      this.addEquals(field, value);
    }
    return this;
  }

  /**
   * Agrega un filtro LIKE para búsqueda de texto
   * @param {string} field - Nombre del campo de texto
   * @param {string} value - Texto a buscar
   * @returns {FilterBuilder} - Para encadenamiento
   */
  addLike(field, value) {
    if (value !== undefined && value !== null && value !== '') {
      this.where[field] = { [Op.iLike]: `%${value}%` };
    }
    return this;
  }

  /**
   * Obtiene el objeto where construido
   * @returns {Object} - Filtros para Sequelize
   */
  build() {
    return this.where;
  }
}

/**
 * Construye opciones de query completas para Sequelize
 * @param {Object} params - Parámetros de query
 * @param {Object} where - Filtros WHERE
 * @param {Array} includes - Includes para relaciones
 * @returns {Object} - Opciones completas para findAll/findAndCountAll
 */
export function buildQueryOptions({
  where,
  includes = [],
  orderBy = 'createdAt',
  orderDirection = 'DESC',
  limit,
  offset = 0
}) {
  const queryOptions = {
    where,
    include: includes,
    order: [[orderBy, orderDirection.toUpperCase()]]
  };

  if (limit) {
    queryOptions.limit = parseInt(limit);
    queryOptions.offset = parseInt(offset);
  }

  return queryOptions;
}

/**
 * Construye objeto de paginación estandarizado
 * @param {number} total - Total de registros
 * @param {number} limit - Límite de registros por página
 * @param {number} offset - Offset actual
 * @returns {Object} - Información de paginación
 */
export function buildPagination(total, limit, offset) {
  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);

  return {
    total,
    limit: parsedLimit,
    offset: parsedOffset,
    hasNext: parsedOffset + parsedLimit < total,
    hasPrev: parsedOffset > 0
  };
}
