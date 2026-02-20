import { BaseService } from './base.service.js';
import { IngresoRecurrente, FuenteIngreso, FrecuenciaGasto } from '../models/index.js';
import ExchangeRateService from './exchangeRate.service.js';
import logger from '../utils/logger.js';

/**
 * Service for managing ingresos recurrentes (recurring incomes)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for recurring incomes with multi-currency support
 */
export class IngresoRecurrenteService extends BaseService {
  constructor() {
    super(IngresoRecurrente);
  }

  /**
   * Find all recurring incomes with related data
   * Overrides base method to include specific associations
   */
  async findAll(options = {}) {
    const defaultOptions = {
      include: [
        { model: FuenteIngreso, as: 'fuenteIngreso' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      order: [['id', 'DESC']],
      ...options
    };

    return super.findAll(defaultOptions);
  }

  /**
   * Find all recurring incomes for a specific user
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
   * Find recurring income by ID with related data
   * Overrides base method to include specific associations
   */
  async findById(id, options = {}) {
    const defaultOptions = {
      include: [
        { model: FuenteIngreso, as: 'fuenteIngreso' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      ...options
    };

    return super.findById(id, defaultOptions);
  }

  /**
   * Find recurring income by ID for a specific user
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
   * Create recurring income for a specific user
   * 💱 Handles multi-currency conversion automatically
   * @param {Object} data - Recurring income data
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
   * Create recurring income with validation and multi-currency support
   * 💱 Calculates both currencies based on moneda_origen
   * @param {Object} data - Recurring income data
   */
  async create(data) {
    // Validate recurring income specific rules
    this.validateRecurringIncomeData(data);

    const monedaOrigen = data.moneda_origen || 'ARS';
    const monto = data.monto;

    let processedData = {
      ...data,
      moneda_origen: monedaOrigen,
      activo: data.activo ?? true
    };

    // Calculate both currencies if not already provided
    if (!data.monto_ars || !data.monto_usd) {
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

        processedData = {
          ...processedData,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        };

        logger.debug('Multi-currency conversion applied to IngresoRecurrente', {
          moneda_origen: monedaOrigen,
          monto_original: monto,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        });
      } catch (exchangeError) {
        logger.warn('Exchange rate conversion failed, using backward compatibility', {
          error: exchangeError.message
        });

        if (monedaOrigen === 'ARS') {
          processedData.monto_ars = monto;
          processedData.monto_usd = null;
        } else {
          processedData.monto_usd = monto;
          processedData.monto_ars = null;
        }
      }
    }

    const recurringIncome = await super.create(processedData);

    logger.info('Recurring income created successfully (multi-currency)', {
      id: recurringIncome.id,
      descripcion: recurringIncome.descripcion,
      monto_ars: recurringIncome.monto_ars,
      monto_usd: recurringIncome.monto_usd,
      moneda_origen: recurringIncome.moneda_origen,
      frecuencia_id: recurringIncome.frecuencia_gasto_id
    });

    return recurringIncome;
  }

  /**
   * Update recurring income with validation
   * @param {number} id - ID of the income to update
   * @param {Object} data - Update data
   */
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Validate update data
    this.validateRecurringIncomeData(data, true);

    // Log important changes
    if (data.monto && data.monto !== existing.monto) {
      logger.info('Recurring income amount updated', {
        id,
        oldAmount: existing.monto,
        newAmount: data.monto,
        descripcion: existing.descripcion
      });
    }

    if (data.activo === false && existing.activo === true) {
      logger.info('Recurring income deactivated', {
        id,
        descripcion: existing.descripcion
      });
    }

    const sanitizedData = this.sanitizeUpdateData(data);
    return super.update(id, sanitizedData);
  }

  /**
   * Update recurring income for a specific user
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
   * Delete recurring income for a specific user
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
   * Find active recurring incomes
   */
  async findActive() {
    return this.findAll({
      where: { activo: true }
    });
  }

  /**
   * Find active recurring incomes for a specific user
   * @param {number} userId - ID of the user
   */
  async findActiveByUser(userId) {
    return this.findAllByUser(userId, {
      where: { activo: true }
    });
  }

  /**
   * Find recurring incomes by frequency
   * @param {number} frecuenciaId - ID of the frequency
   */
  async findByFrequency(frecuenciaId) {
    return this.findAll({
      where: { frecuencia_gasto_id: frecuenciaId }
    });
  }

  /**
   * Toggle active status of recurring income
   * @param {number} id - ID of the income
   */
  async toggleActive(id) {
    const income = await this.findById(id);
    if (!income) {
      return null;
    }

    const newStatus = !income.activo;
    const updated = await this.update(id, { activo: newStatus });

    logger.info(`Recurring income ${newStatus ? 'activated' : 'deactivated'}`, {
      id,
      descripcion: income.descripcion,
      newStatus
    });

    return updated;
  }

  /**
   * Toggle active status for a specific user
   * @param {number} id - ID of the income
   * @param {number} userId - ID of the user
   */
  async toggleActiveForUser(id, userId) {
    const existing = await this.findByIdAndUser(id, userId);
    if (!existing) {
      return null;
    }

    return this.toggleActive(id);
  }

  /**
   * Validate recurring income data
   * @param {Object} data - Income data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   */
  validateRecurringIncomeData(data, isUpdate = false) {
    const errors = [];

    // Amount validation
    if (data.monto !== undefined) {
      if (typeof data.monto !== 'number' || data.monto <= 0) {
        errors.push('El monto debe ser un número positivo');
      }
    }

    // Payment day validation
    if (data.dia_de_pago !== undefined) {
      if (!Number.isInteger(data.dia_de_pago) || data.dia_de_pago < 1 || data.dia_de_pago > 31) {
        errors.push('El día de pago debe ser un número entero entre 1 y 31');
      }
    }

    // Payment month validation (for annual frequency)
    if (data.mes_de_pago !== undefined && data.mes_de_pago !== null) {
      if (!Number.isInteger(data.mes_de_pago) || data.mes_de_pago < 1 || data.mes_de_pago > 12) {
        errors.push('El mes de pago debe ser un número entero entre 1 y 12');
      }
    }

    // For creation, require mandatory fields
    if (!isUpdate) {
      if (!data.descripcion) {
        errors.push('La descripción es requerida');
      }
      if (!data.monto) {
        errors.push('El monto es requerido');
      }
      if (!data.dia_de_pago) {
        errors.push('El día de pago es requerido');
      }
      if (!data.frecuencia_gasto_id) {
        errors.push('La frecuencia es requerida');
      }
      if (!data.fuente_ingreso_id) {
        errors.push('La fuente de ingreso es requerida');
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed for recurring income');
      error.validationErrors = errors;
      throw error;
    }
  }

  /**
   * Sanitize update data to prevent unwanted field updates
   * 💱 Includes multi-currency fields
   */
  sanitizeUpdateData(data) {
    const allowedFields = [
      'descripcion', 'monto', 'dia_de_pago', 'mes_de_pago',
      'frecuencia_gasto_id', 'fuente_ingreso_id', 'activo',
      'fecha_inicio', 'fecha_fin',
      // 💱 Multi-currency fields
      'moneda_origen', 'monto_ars', 'monto_usd', 'tipo_cambio_referencia'
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
