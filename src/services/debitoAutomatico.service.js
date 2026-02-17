import { BaseService } from './base.service.js';
import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import ExchangeRateService from './exchangeRate.service.js';
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
   * 💱 Handles multi-currency conversion automatically
   */
  async create(data) {
    // Validate automatic debit specific rules
    this.validateAutomaticDebitData(data);

    // 💱 Calculate both currencies based on moneda_origen
    const monedaOrigen = data.moneda_origen || 'ARS';
    const monto = data.monto;

    // Set default values for automatic debits
    let processedData = {
      ...data,
      moneda_origen: monedaOrigen,
      activo: data.activo ?? true,
      ultima_fecha_generado: null
    };

    // Only calculate if not already provided
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

        logger.debug('Multi-currency conversion applied to DebitoAutomatico', {
          moneda_origen: monedaOrigen,
          monto_original: monto,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        });
      } catch (exchangeError) {
        // If exchange rate service fails, use backward compatibility
        logger.warn('Exchange rate conversion failed, using backward compatibility', {
          error: exchangeError.message
        });

        if (monedaOrigen === 'ARS') {
          processedData.monto_ars = monto;
          processedData.monto_usd = null;
        } else {
          processedData.monto_ars = monto; // Fallback
          processedData.monto_usd = null;
        }
      }
    }

    const automaticDebit = await super.create(processedData);

    logger.info('Automatic debit created successfully (multi-currency)', {
      id: automaticDebit.id,
      descripcion: automaticDebit.descripcion,
      monto_ars: automaticDebit.monto_ars,
      monto_usd: automaticDebit.monto_usd,
      moneda_origen: automaticDebit.moneda_origen,
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
   * Used by the scheduler service - Enhanced with advanced frequency logic
   * @param {number|null} userId - ID del usuario para filtrar (null = todos los usuarios)
   */
  async findReadyForGeneration(userId = null) {
    const today = moment().tz('America/Argentina/Buenos_Aires');

    logger.debug('Finding automatic debits ready for generation', {
      date: today.format('YYYY-MM-DD'),
      day: today.format('dddd'),
      userId: userId || 'all'
    });

    // Build where clause with optional user filter
    const whereClause = { activo: true };
    if (userId) {
      whereClause.usuario_id = userId;
    }

    const activeDebits = await this.findAll({ where: whereClause });
    const readyDebits = [];

    for (const debit of activeDebits) {
      try {
        const shouldGenerate = await this.shouldGenerateExpense(debit, today);
        if (shouldGenerate.should) {
          // Add generation reason for debugging
          debit.generationReason = shouldGenerate.reason;
          debit.adjustedDate = shouldGenerate.adjustedDate;
          readyDebits.push(debit);

          logger.debug('Automatic debit ready for generation', {
            debit_id: debit.id,
            descripcion: debit.descripcion,
            reason: shouldGenerate.reason,
            frecuencia: debit.frecuencia?.nombre
          });
        }
      } catch (error) {
        logger.error('Error checking automatic debit generation', {
          debit_id: debit.id,
          error: error.message
        });
      }
    }

    logger.info('Automatic debits ready for generation', {
      total_active: activeDebits.length,
      ready_count: readyDebits.length,
      ready_debits: readyDebits.map(d => ({
        id: d.id,
        descripcion: d.descripcion,
        reason: d.generationReason
      }))
    });

    return readyDebits;
  }

  /**
   * Intelligent debit generation logic with advanced frequency handling
   * @param {Object} debit - The automatic debit
   * @param {moment.Moment} today - Current date
   * @returns {Object} Generation decision with reason
   */
  async shouldGenerateExpense(debit, today) {
    // Get frequency information first to determine how to check duplicates
    const frecuencia = debit.frecuencia;

    // Check if already generated (period depends on frequency)
    if (debit.ultima_fecha_generado && frecuencia) {
      const ultimaFecha = moment(debit.ultima_fecha_generado).tz('America/Argentina/Buenos_Aires');
      const frecuenciaNombre = frecuencia.nombre_frecuencia?.toLowerCase();

      // For monthly/biweekly frequencies, check if already generated this month
      if (frecuenciaNombre === 'mensual' || frecuenciaNombre === 'quincenal') {
        if (ultimaFecha.isSame(today, 'month') && ultimaFecha.isSame(today, 'year')) {
          return { should: false, reason: 'Already generated this month' };
        }
      } else if (frecuenciaNombre === 'semanal') {
        // For weekly, check if already generated this week
        if (ultimaFecha.isSame(today, 'week') && ultimaFecha.isSame(today, 'year')) {
          return { should: false, reason: 'Already generated this week' };
        }
      } else if (frecuenciaNombre === 'diaria') {
        // For daily, check if already generated today
        if (ultimaFecha.isSame(today, 'day')) {
          return { should: false, reason: 'Already generated today' };
        }
      }
    }

    // Check date boundaries
    if (!this.validateDateBoundaries(debit, today)) {
      return { should: false, reason: 'Outside valid date range' };
    }

    // Check frequency-specific logic
    const frequencyCheck = await this.checkFrequencyMatch(debit, today);
    if (!frequencyCheck.matches) {
      return { should: false, reason: frequencyCheck.reason };
    }

    return {
      should: true,
      reason: frequencyCheck.reason,
      adjustedDate: frequencyCheck.adjustedDate
    };
  }

  /**
   * Validate date boundaries for automatic debits
   * @param {Object} debit - The automatic debit
   * @param {moment.Moment} today - Current date
   * @returns {boolean} True if within valid range
   */
  validateDateBoundaries(debit, today) {
    // Check start date
    if (debit.fecha_inicio) {
      const fechaInicio = moment(debit.fecha_inicio).tz('America/Argentina/Buenos_Aires');
      if (today.isBefore(fechaInicio, 'day')) {
        return false;
      }
    }

    // Check end date (specific to automatic debits)
    if (debit.fecha_fin) {
      const fechaFin = moment(debit.fecha_fin).tz('America/Argentina/Buenos_Aires');
      if (today.isAfter(fechaFin, 'day')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Advanced frequency matching for automatic debits
   * @param {Object} debit - The automatic debit
   * @param {moment.Moment} today - Current date
   * @returns {Object} Match result with reason
   */
  async checkFrequencyMatch(debit, today) {
    if (!debit.frecuencia) {
      return { matches: false, reason: 'No frequency configured' };
    }

    const frecuenciaNombre = debit.frecuencia.nombre_frecuencia.toLowerCase();
    const diaConfigurido = debit.dia_de_pago;
    const mesConfigurado = debit.mes_de_pago;

    logger.debug('Checking frequency for automatic debit', {
      debit_id: debit.id,
      frecuencia: frecuenciaNombre,
      dia_configurado: diaConfigurido,
      mes_configurado: mesConfigurado,
      fecha_hoy: today.format('YYYY-MM-DD')
    });

    switch (frecuenciaNombre) {
    case 'diaria':
      return { matches: true, reason: 'Daily frequency matches' };

    case 'semanal': {
      // Weekly: check if it's the same day of week as configured
      if (diaConfigurido >= 0 && diaConfigurido <= 6) {
        const matches = today.day() === diaConfigurido;
        return {
          matches,
          reason: matches ? 'Weekly frequency matches' : `Weekly: today is ${today.format('dddd')}, expected day ${diaConfigurido}`
        };
      }
      // Fallback to day of month for backwards compatibility
      const weeklyTolerance = this.calculateDateTolerance(today, 'semanal');
      const weeklyMatches = this.checkDayWithTolerance(today, diaConfigurido, weeklyTolerance);
      return {
        matches: weeklyMatches.matches,
        reason: weeklyMatches.matches ? 'Weekly frequency matches (day of month)' : weeklyMatches.reason,
        adjustedDate: weeklyMatches.adjustedDate
      };
    }
    case 'quincenal': {
      // Biweekly: 1st and 15th of month, or every 14 days from start
      if (debit.fecha_inicio) {
        const fechaInicio = moment(debit.fecha_inicio).tz('America/Argentina/Buenos_Aires');
        const daysDiff = today.diff(fechaInicio, 'days');
        const matches = daysDiff >= 0 && daysDiff % 14 === 0;
        return {
          matches,
          reason: matches ? 'Biweekly frequency matches (14-day cycle)' : 'Not on 14-day cycle'
        };
      }
      // Default: 1st and 15th
      const biweeklyMatches = today.date() === 1 || today.date() === 15;
      return {
        matches: biweeklyMatches,
        reason: biweeklyMatches ? 'Biweekly frequency matches (1st/15th)' : 'Not 1st or 15th of month'
      };
    }
    case 'mensual': {
      const monthlyTolerance = this.calculateDateTolerance(today, 'mensual');
      const monthlyCheck = this.checkDayWithTolerance(today, diaConfigurido, monthlyTolerance);
      return {
        matches: monthlyCheck.matches,
        reason: monthlyCheck.matches ? 'Monthly frequency matches' : monthlyCheck.reason,
        adjustedDate: monthlyCheck.adjustedDate
      };
    }
    case 'bimestral':
      // Every 2 months
      if (debit.fecha_inicio) {
        const fechaInicio = moment(debit.fecha_inicio).tz('America/Argentina/Buenos_Aires');
        const monthsDiff = today.diff(fechaInicio, 'months');
        if (monthsDiff >= 0 && monthsDiff % 2 === 0) {
          const bimonthlyTolerance = this.calculateDateTolerance(today, 'bimestral');
          const bimonthlyCheck = this.checkDayWithTolerance(today, diaConfigurido, bimonthlyTolerance);
          return {
            matches: bimonthlyCheck.matches,
            reason: bimonthlyCheck.matches ? 'Bimonthly frequency matches' : bimonthlyCheck.reason,
            adjustedDate: bimonthlyCheck.adjustedDate
          };
        }
      }
      return { matches: false, reason: 'Not on bimonthly cycle' };

    case 'trimestral':
      // Every 3 months
      if (debit.fecha_inicio) {
        const fechaInicio = moment(debit.fecha_inicio).tz('America/Argentina/Buenos_Aires');
        const monthsDiff = today.diff(fechaInicio, 'months');
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          const quarterlyTolerance = this.calculateDateTolerance(today, 'trimestral');
          const quarterlyCheck = this.checkDayWithTolerance(today, diaConfigurido, quarterlyTolerance);
          return {
            matches: quarterlyCheck.matches,
            reason: quarterlyCheck.matches ? 'Quarterly frequency matches' : quarterlyCheck.reason,
            adjustedDate: quarterlyCheck.adjustedDate
          };
        }
      }
      return { matches: false, reason: 'Not on quarterly cycle' };

    case 'semestral':
      // Every 6 months
      if (debit.fecha_inicio) {
        const fechaInicio = moment(debit.fecha_inicio).tz('America/Argentina/Buenos_Aires');
        const monthsDiff = today.diff(fechaInicio, 'months');
        if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
          const semiannualTolerance = this.calculateDateTolerance(today, 'semestral');
          const semiannualCheck = this.checkDayWithTolerance(today, diaConfigurido, semiannualTolerance);
          return {
            matches: semiannualCheck.matches,
            reason: semiannualCheck.matches ? 'Semiannual frequency matches' : semiannualCheck.reason,
            adjustedDate: semiannualCheck.adjustedDate
          };
        }
      }
      return { matches: false, reason: 'Not on semiannual cycle' };

    case 'anual': {
      // Annual: check month and day
      if (mesConfigurado && today.month() + 1 !== mesConfigurado) {
        return { matches: false, reason: `Annual: current month ${today.month() + 1}, expected ${mesConfigurado}` };
      }
      const annualTolerance = this.calculateDateTolerance(today, 'anual');
      const annualCheck = this.checkDayWithTolerance(today, diaConfigurido, annualTolerance);
      return {
        matches: annualCheck.matches,
        reason: annualCheck.matches ? 'Annual frequency matches' : annualCheck.reason,
        adjustedDate: annualCheck.adjustedDate
      };
    }
    default:
      return { matches: false, reason: `Unsupported frequency: ${frecuenciaNombre}` };
    }
  }

  /**
   * Check day with tolerance for missed payments
   * @param {moment.Moment} today - Current date
   * @param {number} targetDay - Target day of month
   * @param {number} tolerance - Days of tolerance
   * @returns {Object} Match result
   */
  checkDayWithTolerance(today, targetDay, tolerance) {
    const todayDay = today.date();
    const validDay = this.getValidMonthlyDate(today, targetDay);

    // Exact match
    if (todayDay === validDay) {
      return { matches: true, reason: 'Exact day match', adjustedDate: today.format('YYYY-MM-DD') };
    }

    // Tolerance check for weekends and holidays
    const diff = Math.abs(todayDay - validDay);
    if (diff <= tolerance) {
      const reason = `Within tolerance: target ${validDay}, actual ${todayDay}, tolerance ${tolerance}`;
      return { matches: true, reason, adjustedDate: today.format('YYYY-MM-DD') };
    }

    return {
      matches: false,
      reason: `Day mismatch: target ${validDay}, actual ${todayDay}, tolerance ${tolerance}`
    };
  }

  /**
   * Get valid day for month, handling edge cases like February 31st
   * @param {moment.Moment} date - Reference date
   * @param {number} targetDay - Target day
   * @returns {number} Valid day for the month
   */
  getValidMonthlyDate(date, targetDay) {
    const daysInMonth = date.daysInMonth();
    return Math.min(targetDay, daysInMonth);
  }

  /**
   * Calculate tolerance based on frequency
   * @param {moment.Moment} date - Reference date
   * @param {string} frequency - Frequency type
   * @returns {number} Days of tolerance
   */
  calculateDateTolerance(date, frequency) {
    // Weekend tolerance
    const isWeekend = date.day() === 0 || date.day() === 6;
    const baseWeekendTolerance = isWeekend ? 2 : 1;

    switch (frequency) {
    case 'diaria':
      return 0; // No tolerance for daily
    case 'semanal':
      return baseWeekendTolerance;
    case 'quincenal':
      return Math.max(baseWeekendTolerance, 1);
    case 'mensual':
      return Math.max(baseWeekendTolerance, 2);
    case 'bimestral':
    case 'trimestral':
      return Math.max(baseWeekendTolerance, 3);
    case 'semestral':
    case 'anual':
      return Math.max(baseWeekendTolerance, 5);
    default:
      return baseWeekendTolerance;
    }
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
