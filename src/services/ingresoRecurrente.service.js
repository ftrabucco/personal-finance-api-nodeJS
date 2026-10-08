import { BaseService } from './base.service.js';
import { IngresoRecurrente, FuenteIngreso, FrecuenciaGasto } from '../models/index.js';
import ExchangeRateService from './exchangeRate.service.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

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
   * Re-fetch a ingreso recurrente with a row lock (SELECT ... FOR UPDATE),
   * for use inside the same transaction that will generate its next
   * occurrence. Serializes concurrent generation attempts for the same
   * source — same pattern as GastoRecurrenteService.lockForGeneration.
   *
   * Fetched with no includes: `shouldGenerateIncome` reads `frecuencia` as
   * a nested object, so it's fetched separately and attached below (a
   * locked SELECT can't carry a LEFT OUTER JOIN on a nullable association).
   */
  async lockForGeneration(id, transaction) {
    const income = await this.model.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!income) {
      return null;
    }

    income.frecuencia = await FrecuenciaGasto.findByPk(income.frecuencia_gasto_id, { transaction });

    return income;
  }

  /**
   * Find recurring incomes ready for generation today.
   * Mirrors GastoRecurrenteService.findReadyForGeneration.
   * @param {number|null} userId - ID del usuario para filtrar (null = todos los usuarios)
   */
  async findReadyForGeneration(userId = null) {
    const today = moment().tz('America/Argentina/Buenos_Aires');

    const whereClause = { activo: true };
    if (userId) {
      whereClause.usuario_id = userId;
    }

    const activeIncomes = await this.model.findAll({
      where: whereClause,
      include: [
        { model: FuenteIngreso, as: 'fuenteIngreso' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });

    const readyIncomes = [];

    for (const income of activeIncomes) {
      try {
        const shouldGenerate = await this.shouldGenerateIncome(income, today);
        if (shouldGenerate.canGenerate) {
          income.generationReason = shouldGenerate.reason;
          income.adjustedDate = shouldGenerate.adjustedDate;
          readyIncomes.push(income);
        }
      } catch (error) {
        logger.error('Error checking income generation readiness', {
          incomeId: income.id,
          error: error.message
        });
      }
    }

    logger.info('Recurring income generation check completed', {
      totalActive: activeIncomes.length,
      readyForGeneration: readyIncomes.length
    });

    return readyIncomes;
  }

  /**
   * Advanced logic to determine if an income should be generated today.
   * Direct port of GastoRecurrenteService.shouldGenerateExpense — same
   * frequency catalog (`frecuencias_gasto`), same shape of
   * dia_de_pago/mes_de_pago/fecha_inicio/fecha_fin/ultima_fecha_generado.
   */
  async shouldGenerateIncome(income, today) {
    const result = {
      canGenerate: false,
      reason: '',
      adjustedDate: null
    };

    const frecuencia = income.frecuencia;
    if (!frecuencia) {
      result.reason = 'No frequency defined';
      return result;
    }

    if (income.ultima_fecha_generado) {
      const ultimaFecha = moment(income.ultima_fecha_generado);
      const frecuenciaNombre = frecuencia.nombre_frecuencia?.toLowerCase();

      if (frecuenciaNombre === 'mensual' || frecuenciaNombre === 'quincenal') {
        if (ultimaFecha.isSame(today, 'month') && ultimaFecha.isSame(today, 'year')) {
          result.reason = 'Already generated this month';
          return result;
        }
      } else if (frecuenciaNombre === 'semanal') {
        if (ultimaFecha.isSame(today, 'week') && ultimaFecha.isSame(today, 'year')) {
          result.reason = 'Already generated this week';
          return result;
        }
      } else if (frecuenciaNombre === 'diaria') {
        if (ultimaFecha.isSame(today, 'day')) {
          result.reason = 'Already generated today';
          return result;
        }
      } else if (frecuenciaNombre === 'trimestral') {
        const monthsSince = today.diff(ultimaFecha, 'months');
        if (monthsSince < 3) {
          result.reason = `Already generated ${monthsSince} months ago (quarterly needs 3)`;
          return result;
        }
      } else if (frecuenciaNombre === 'semestral') {
        const monthsSince = today.diff(ultimaFecha, 'months');
        if (monthsSince < 6) {
          result.reason = `Already generated ${monthsSince} months ago (semiannual needs 6)`;
          return result;
        }
      } else if (frecuenciaNombre === 'anual') {
        if (ultimaFecha.isSame(today, 'year')) {
          result.reason = 'Already generated this year';
          return result;
        }
      }
    }

    if (income.fecha_inicio) {
      const fechaInicio = moment(income.fecha_inicio);
      if (today.isBefore(fechaInicio, 'day')) {
        result.reason = 'Start date not reached';
        return result;
      }
    }

    if (income.fecha_fin) {
      const fechaFin = moment(income.fecha_fin);
      if (today.isAfter(fechaFin, 'day')) {
        result.reason = 'End date passed';
        return result;
      }
    }

    const frequencyCheck = this.checkFrequencyMatch(income, today, frecuencia);

    if (frequencyCheck.matches) {
      result.canGenerate = true;
      result.reason = frequencyCheck.reason;
      result.adjustedDate = frequencyCheck.adjustedDate;
    } else {
      result.reason = frequencyCheck.reason;
    }

    return result;
  }

  /**
   * Check if current date matches the frequency pattern.
   * Direct port of GastoRecurrenteService.checkFrequencyMatch.
   */
  checkFrequencyMatch(income, today, frecuencia) {
    const diaActual = today.date();
    const mesActual = today.month() + 1;

    switch (frecuencia.nombre_frecuencia?.toLowerCase()) {
    case 'único':
    case 'unico':
      return {
        matches: false,
        reason: 'One-time frequency - should not generate recurring incomes',
        adjustedDate: null
      };

    case 'diario':
      return {
        matches: true,
        reason: 'Daily frequency - generate every day',
        adjustedDate: today.format('YYYY-MM-DD')
      };

    case 'semanal':
      return this.checkWeeklyFrequency(income, today);

    case 'quincenal':
      return this.checkBiweeklyFrequency(income, today, diaActual);

    case 'mensual':
      return this.checkMonthlyFrequency(income, today, diaActual);

    case 'bimestral':
      return this.checkBimonthlyFrequency(income, today, diaActual, mesActual);

    case 'trimestral':
      return this.checkQuarterlyFrequency(income, today, diaActual, mesActual);

    case 'semestral':
      return this.checkSemiannualFrequency(income, today, diaActual, mesActual);

    case 'anual':
      return this.checkAnnualFrequency(income, today, diaActual, mesActual);

    default:
      return {
        matches: false,
        reason: `Unknown frequency: ${frecuencia.nombre_frecuencia}`,
        adjustedDate: null
      };
    }
  }

  checkWeeklyFrequency(income, today) {
    if (!income.ultima_fecha_generado) {
      return { matches: true, reason: 'First weekly generation', adjustedDate: today.format('YYYY-MM-DD') };
    }

    const lastGeneration = moment(income.ultima_fecha_generado);
    const daysSince = today.diff(lastGeneration, 'days');

    if (daysSince >= 7) {
      return { matches: true, reason: `Weekly frequency - ${daysSince} days since last generation`, adjustedDate: today.format('YYYY-MM-DD') };
    }

    return { matches: false, reason: `Weekly frequency - only ${daysSince} days since last generation`, adjustedDate: null };
  }

  checkBiweeklyFrequency(income, today, diaActual) {
    const validDays = [1, 15];

    if (validDays.includes(diaActual)) {
      return { matches: true, reason: `Biweekly frequency - generating on day ${diaActual}`, adjustedDate: today.format('YYYY-MM-DD') };
    }

    if (!income.ultima_fecha_generado) {
      const lastValidDay = validDays.filter(d => d < diaActual).pop();
      if (lastValidDay) {
        const catchUpDate = today.clone().date(lastValidDay);
        if (income.fecha_inicio) {
          const fechaInicio = moment(income.fecha_inicio);
          if (catchUpDate.isBefore(fechaInicio, 'day')) {
            return {
              matches: false,
              reason: `Biweekly frequency - catch-up day ${lastValidDay} is before fecha_inicio (${fechaInicio.format('YYYY-MM-DD')})`,
              adjustedDate: null
            };
          }
        }
        return {
          matches: true,
          reason: `Biweekly frequency - catch-up for day ${lastValidDay} (never generated before, currently day ${diaActual})`,
          adjustedDate: catchUpDate.format('YYYY-MM-DD')
        };
      }
    }

    const tolerance = this.calculateDateTolerance(diaActual, validDays);
    if (tolerance.withinTolerance) {
      return { matches: true, reason: `Biweekly frequency - tolerance applied for day ${tolerance.targetDay}`, adjustedDate: today.format('YYYY-MM-DD') };
    }

    return { matches: false, reason: `Biweekly frequency - not on 1st or 15th (current: ${diaActual})`, adjustedDate: null };
  }

  checkMonthlyFrequency(income, today, diaActual) {
    const targetDay = income.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual === adjustedDay) {
      return { matches: true, reason: `Monthly frequency - exact match on day ${adjustedDay}`, adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    if (!income.ultima_fecha_generado && diaActual > adjustedDay) {
      if (income.fecha_inicio) {
        const fechaInicio = moment(income.fecha_inicio);
        if (adjustedDate.isBefore(fechaInicio, 'day')) {
          return {
            matches: false,
            reason: `Monthly frequency - target day ${targetDay} this month (${adjustedDate.format('YYYY-MM-DD')}) is before fecha_inicio (${fechaInicio.format('YYYY-MM-DD')})`,
            adjustedDate: null
          };
        }
      }
      return {
        matches: true,
        reason: `Monthly frequency - catch-up for day ${targetDay} (never generated before, currently day ${diaActual})`,
        adjustedDate: adjustedDate.format('YYYY-MM-DD')
      };
    }

    if (income.ultima_fecha_generado) {
      const tolerance = this.calculateDateTolerance(diaActual, [adjustedDay]);
      if (tolerance.withinTolerance) {
        return {
          matches: true,
          reason: `Monthly frequency - tolerance applied for day ${targetDay} (adjusted to ${adjustedDay})`,
          adjustedDate: adjustedDate.format('YYYY-MM-DD')
        };
      }
    }

    return {
      matches: false,
      reason: `Monthly frequency - target day ${targetDay} (adjusted to ${adjustedDay}), current ${diaActual}`,
      adjustedDate: null
    };
  }

  checkBimonthlyFrequency(income, today, diaActual, _mesActual) {
    const targetDay = income.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return { matches: false, reason: `Bimonthly frequency - wrong day ${diaActual}, expected ${adjustedDay}`, adjustedDate: null };
    }

    if (!income.ultima_fecha_generado) {
      return { matches: true, reason: 'First bimonthly generation', adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    const lastGeneration = moment(income.ultima_fecha_generado);
    const monthsSince = today.diff(lastGeneration, 'months');

    if (monthsSince >= 2) {
      return { matches: true, reason: `Bimonthly frequency - ${monthsSince} months since last generation`, adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    return { matches: false, reason: `Bimonthly frequency - only ${monthsSince} months since last generation`, adjustedDate: null };
  }

  checkQuarterlyFrequency(income, today, diaActual, _mesActual) {
    const targetDay = income.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return { matches: false, reason: `Quarterly frequency - wrong day ${diaActual}, expected ${adjustedDay}`, adjustedDate: null };
    }

    if (!income.ultima_fecha_generado) {
      return { matches: true, reason: 'First quarterly generation', adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    const lastGeneration = moment(income.ultima_fecha_generado);
    const monthsSince = today.diff(lastGeneration, 'months');

    if (monthsSince >= 3) {
      return { matches: true, reason: `Quarterly frequency - ${monthsSince} months since last generation`, adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    return { matches: false, reason: `Quarterly frequency - only ${monthsSince} months since last generation`, adjustedDate: null };
  }

  checkSemiannualFrequency(income, today, diaActual, _mesActual) {
    const targetDay = income.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return { matches: false, reason: `Semiannual frequency - wrong day ${diaActual}, expected ${adjustedDay}`, adjustedDate: null };
    }

    if (!income.ultima_fecha_generado) {
      return { matches: true, reason: 'First semiannual generation', adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    const lastGeneration = moment(income.ultima_fecha_generado);
    const monthsSince = today.diff(lastGeneration, 'months');

    if (monthsSince >= 6) {
      return { matches: true, reason: `Semiannual frequency - ${monthsSince} months since last generation`, adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    return { matches: false, reason: `Semiannual frequency - only ${monthsSince} months since last generation`, adjustedDate: null };
  }

  checkAnnualFrequency(income, today, diaActual, mesActual) {
    const targetDay = income.dia_de_pago;
    const targetMonth = income.mes_de_pago;

    if (!targetMonth) {
      return { matches: false, reason: 'Annual frequency requires mes_de_pago to be set', adjustedDate: null };
    }

    if (mesActual !== targetMonth) {
      return { matches: false, reason: `Annual frequency - wrong month ${mesActual}, expected ${targetMonth}`, adjustedDate: null };
    }

    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual === adjustedDay) {
      return { matches: true, reason: `Annual frequency - exact match on ${mesActual}/${adjustedDay}`, adjustedDate: adjustedDate.format('YYYY-MM-DD') };
    }

    const tolerance = this.calculateDateTolerance(diaActual, [adjustedDay]);
    if (tolerance.withinTolerance) {
      return { matches: true, reason: `Annual frequency - tolerance applied for ${targetMonth}/${targetDay}`, adjustedDate: today.format('YYYY-MM-DD') };
    }

    return {
      matches: false,
      reason: `Annual frequency - target ${targetMonth}/${targetDay} (adjusted to ${adjustedDay}), current ${mesActual}/${diaActual}`,
      adjustedDate: null
    };
  }

  /**
   * Get valid date for monthly recurring, handling edge cases like Feb 31
   */
  getValidMonthlyDate(today, targetDay) {
    const year = today.year();
    const month = today.month();

    const targetDate = moment({ year, month, date: targetDay });

    if (!targetDate.isValid() || targetDate.date() !== targetDay) {
      return moment({ year, month }).endOf('month');
    }

    return targetDate;
  }

  /**
   * Calculate tolerance for missed dates (up to 3 days)
   */
  calculateDateTolerance(currentDay, validDays) {
    const tolerance = 3;

    for (const validDay of validDays) {
      const diff = currentDay - validDay;
      if (diff > 0 && diff <= tolerance) {
        return { withinTolerance: true, targetDay: validDay };
      }
    }

    return { withinTolerance: false, targetDay: null };
  }

  /**
   * Update the last generated date for the recurring income.
   */
  async updateLastGeneratedDate(income, fechaParaBD, transaction) {
    await income.update({ ultima_fecha_generado: fechaParaBD }, { transaction });

    logger.debug('Updated last generated date for ingreso recurrente', {
      id: income.id,
      ultima_fecha_generado: fechaParaBD
    });
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
