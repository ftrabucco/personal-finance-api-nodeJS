import { BaseService } from './base.service.js';
import { IngresoUnico, FuenteIngreso } from '../models/index.js';
import ExchangeRateService from './exchangeRate.service.js';
import logger from '../utils/logger.js';

/**
 * Service for managing ingresos únicos (one-time incomes)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for one-time incomes with multi-currency support
 */
export class IngresoUnicoService extends BaseService {
  constructor() {
    super(IngresoUnico);
  }

  /**
   * Find all one-time incomes with related data
   * Overrides base method to include specific associations
   */
  async findAll(options = {}) {
    const defaultOptions = {
      include: [
        { model: FuenteIngreso, as: 'fuenteIngreso' }
      ],
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      ...options
    };

    return super.findAll(defaultOptions);
  }

  /**
   * Find all one-time incomes for a specific user
   * @param {number} userId - ID of the user
   * @param {Object} options - Additional query options
   */
  async findAllByUser(userId, options = {}) {
    const userFilterOptions = {
      where: {
        usuario_id: userId,
        ...(options.where || {})
      },
      ...options
    };

    return this.findAll(userFilterOptions);
  }

  /**
   * Find one-time income by ID with related data
   * Overrides base method to include specific associations
   */
  async findById(id, options = {}) {
    const defaultOptions = {
      include: [
        { model: FuenteIngreso, as: 'fuenteIngreso' }
      ],
      ...options
    };

    return super.findById(id, defaultOptions);
  }

  /**
   * Find one-time income by ID for a specific user
   * @param {number} id - ID of the income
   * @param {number} userId - ID of the user
   * @param {Object} options - Additional query options
   */
  async findByIdAndUser(id, userId, options = {}) {
    const result = await this.findById(id, options);

    if (result && result.usuario_id !== userId) {
      return null;
    }

    return result;
  }

  /**
   * Create one-time income for a specific user
   * 💱 Handles multi-currency conversion automatically
   * @param {Object} data - One-time income data
   * @param {number} userId - ID of the user
   */
  async createForUser(data, userId) {
    const incomeData = {
      ...data,
      usuario_id: userId
    };

    return this.create(incomeData);
  }

  /**
   * Create one-time income with multi-currency support
   * 💱 Calculates both currencies based on moneda_origen
   * @param {Object} data - One-time income data
   */
  async create(data) {
    const monedaOrigen = data.moneda_origen || 'ARS';
    const monto = data.monto;

    let ingresoData = {
      ...data,
      moneda_origen: monedaOrigen
    };

    // Calculate both currencies if not already provided
    if (!data.monto_ars || !data.monto_usd) {
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

        ingresoData = {
          ...ingresoData,
          monto_ars,
          monto_usd,
          tipo_cambio_usado
        };

        logger.debug('Multi-currency conversion applied to IngresoUnico', {
          moneda_origen: monedaOrigen,
          monto_original: monto,
          monto_ars,
          monto_usd,
          tipo_cambio_usado
        });
      } catch (exchangeError) {
        // Fallback if exchange rate service fails
        logger.warn('Exchange rate conversion failed, using backward compatibility', {
          error: exchangeError.message
        });

        if (monedaOrigen === 'ARS') {
          ingresoData.monto_ars = monto;
          ingresoData.monto_usd = null;
        } else {
          ingresoData.monto_usd = monto;
          ingresoData.monto_ars = null;
        }
      }
    }

    const ingreso = await super.create(ingresoData);

    logger.info('One-time income created successfully (multi-currency)', {
      id: ingreso.id,
      monto_ars: ingreso.monto_ars,
      monto_usd: ingreso.monto_usd,
      moneda_origen: ingreso.moneda_origen,
      descripcion: ingreso.descripcion
    });

    return ingreso;
  }

  /**
   * Update one-time income
   * 💱 Handles multi-currency fields
   * @param {number} id - ID of the income to update
   * @param {Object} data - Update data
   */
  async update(id, data) {
    const sanitizedData = this.sanitizeUpdateData(data);
    return super.update(id, sanitizedData);
  }

  /**
   * Update one-time income for a specific user
   * @param {number} id - ID of the income
   * @param {number} userId - ID of the user
   * @param {Object} data - Update data
   */
  async updateForUser(id, userId, data) {
    const existing = await this.findByIdAndUser(id, userId);
    if (!existing) {
      return null;
    }

    return this.update(id, data);
  }

  /**
   * Delete one-time income for a specific user
   * @param {number} id - ID of the income
   * @param {number} userId - ID of the user
   */
  async deleteForUser(id, userId) {
    const existing = await this.findByIdAndUser(id, userId);
    if (!existing) {
      return null;
    }

    return super.delete(id);
  }

  /**
   * Find incomes by date range for a specific user
   * @param {number} userId - ID of the user
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   */
  async findByDateRangeAndUser(userId, startDate, endDate) {
    const { Op } = await import('sequelize');

    return this.findAllByUser(userId, {
      where: {
        fecha: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });
  }

  /**
   * Sanitize update data to prevent unwanted field updates
   * 💱 Includes multi-currency fields
   */
  sanitizeUpdateData(data) {
    const allowedFields = [
      'descripcion', 'monto', 'fecha', 'fuente_ingreso_id',
      // 💱 Multi-currency fields
      'moneda_origen', 'monto_ars', 'monto_usd', 'tipo_cambio_usado'
    ];

    const sanitized = {};
    allowedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        sanitized[field] = data[field];
      }
    });

    return sanitized;
  }
}
