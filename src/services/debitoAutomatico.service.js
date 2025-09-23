import { BaseService } from './base.service.js';
import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Service for managing débitos automáticos (automatic debits)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for automatic debits
 */
export class DebitoAutomaticoService extends BaseService {
  constructor() {
    super(DebitoAutomatico);
  }

  /**
   * Find all automatic debits with related data
   * Overrides base method to include specific associations
   */
  async findAll(options = {}) {
    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      order: [['id', 'DESC']],
      ...options
    };

    return super.findAll(defaultOptions);
  }

  /**
   * Find automatic debit by ID with related data
   * Overrides base method to include specific associations
   */
  async findById(id, options = {}) {
    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      ...options
    };

    return super.findById(id, defaultOptions);
  }

  /**
   * Create automatic debit with validation
   * Adds business logic specific to automatic debits
   */
  async create(data) {
    // Validate automatic debit specific rules
    this.validateAutomaticDebitData(data);

    // Set default values for automatic debits
    const processedData = {
      ...data,
      activo: data.activo ?? true,
      ultima_fecha_generado: null
    };

    const automaticDebit = await super.create(processedData);

    logger.info('Automatic debit created successfully', {
      id: automaticDebit.id,
      descripcion: automaticDebit.descripcion,
      monto: automaticDebit.monto,
      frecuencia_id: automaticDebit.frecuencia_gasto_id
    });

    return automaticDebit;
  }

  /**
   * Update automatic debit with validation
   * Includes specific validation for automatic debit updates
   */
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Validate update data
    this.validateAutomaticDebitData(data);

    // Log important changes
    if (data.monto && data.monto !== existing.monto) {
      logger.info('Automatic debit amount updated', {
        id,
        oldAmount: existing.monto,
        newAmount: data.monto,
        descripcion: existing.descripcion
      });
    }

    if (data.activo === false && existing.activo === true) {
      logger.info('Automatic debit deactivated', {
        id,
        descripcion: existing.descripcion
      });
    }

    if (data.fecha_fin && !existing.fecha_fin) {
      logger.info('Automatic debit end date set', {
        id,
        fecha_fin: data.fecha_fin,
        descripcion: existing.descripcion
      });
    }

    return super.update(id, data);
  }

  /**
   * Find active automatic debits (for generation process)
   */
  async findActive() {
    return this.findAll({
      where: { activo: true }
    });
  }

  /**
   * Find automatic debits by frequency
   */
  async findByFrequency(frecuenciaId) {
    return this.findAll({
      where: { frecuencia_gasto_id: frecuenciaId }
    });
  }

  /**
   * Find automatic debits that should generate today
   * Used by the scheduler service
   */
  async findReadyForGeneration() {
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const diaActual = today.date();
    const mesActual = today.month() + 1;

    const activeDebits = await this.findActive();

    return activeDebits.filter(debit => {
      // Check if it's the payment day
      if (debit.dia_de_pago !== diaActual) {
        return false;
      }

      // For annual frequency, check month
      if (debit.mes_de_pago && debit.mes_de_pago !== mesActual) {
        return false;
      }

      // Check if already generated today
      if (debit.ultima_fecha_generado) {
        const ultimaFecha = moment(debit.ultima_fecha_generado);
        if (ultimaFecha.isSame(today, 'day')) {
          return false;
        }
      }

      // Check start date
      if (debit.fecha_inicio) {
        const fechaInicio = moment(debit.fecha_inicio);
        if (today.isBefore(fechaInicio, 'day')) {
          return false;
        }
      }

      // Check end date (specific to automatic debits)
      if (debit.fecha_fin) {
        const fechaFin = moment(debit.fecha_fin);
        if (today.isAfter(fechaFin, 'day')) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Find expiring automatic debits (ending within next N days)
   */
  async findExpiring(days = 30) {
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const cutoffDate = today.clone().add(days, 'days');

    return this.findAll({
      where: {
        activo: true,
        fecha_fin: {
          [Op.between]: [today.format('YYYY-MM-DD'), cutoffDate.format('YYYY-MM-DD')]
        }
      }
    });
  }

  /**
   * Toggle active status of automatic debit
   */
  async toggleActive(id) {
    const debit = await this.findById(id);
    if (!debit) {
      return null;
    }

    const newStatus = !debit.activo;
    const updated = await this.update(id, { activo: newStatus });

    logger.info(`Automatic debit ${newStatus ? 'activated' : 'deactivated'}`, {
      id,
      descripcion: debit.descripcion,
      newStatus
    });

    return updated;
  }

  /**
   * Extend automatic debit end date
   */
  async extendEndDate(id, newEndDate) {
    const debit = await this.findById(id);
    if (!debit) {
      return null;
    }

    const updated = await this.update(id, { fecha_fin: newEndDate });

    logger.info('Automatic debit end date extended', {
      id,
      descripcion: debit.descripcion,
      oldEndDate: debit.fecha_fin,
      newEndDate
    });

    return updated;
  }

  /**
   * Validate automatic debit data
   * @param {Object} data - Debit data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   */
  validateAutomaticDebitData(data) {
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

    // Start date validation
    if (data.fecha_inicio) {
      const fechaInicio = moment(data.fecha_inicio);
      if (!fechaInicio.isValid()) {
        errors.push('La fecha de inicio debe ser una fecha válida');
      }
    }

    // End date validation (specific to automatic debits)
    if (data.fecha_fin) {
      const fechaFin = moment(data.fecha_fin);
      if (!fechaFin.isValid()) {
        errors.push('La fecha de fin debe ser una fecha válida');
      }

      // End date should be after start date
      if (data.fecha_inicio) {
        const fechaInicio = moment(data.fecha_inicio);
        if (fechaFin.isSameOrBefore(fechaInicio)) {
          errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
        }
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed for automatic debit');
      error.validationErrors = errors;
      throw error;
    }
  }
}