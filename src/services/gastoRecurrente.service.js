import { BaseService } from './base.service.js';
import { GastoRecurrente, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import ExchangeRateService from './exchangeRate.service.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Service for managing gastos recurrentes (recurring expenses)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for recurring expenses
 */
export class GastoRecurrenteService extends BaseService {
  constructor() {
    super(GastoRecurrente);
  }

  /**
   * Find all recurring expenses with related data
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
   * Find recurring expense by ID with related data
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
   * Create recurring expense with validation
   * Adds business logic specific to recurring expenses
   * 💱 Handles multi-currency conversion automatically
   */
  async create(data) {
    // Validate recurring expense specific rules
    this.validateRecurringExpenseData(data);

    // 💱 Calculate both currencies based on moneda_origen
    const monedaOrigen = data.moneda_origen || 'ARS';
    const monto = data.monto;

    // Set default values for recurring expenses
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

        logger.debug('Multi-currency conversion applied to GastoRecurrente', {
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

    const recurringExpense = await super.create(processedData);

    logger.info('Recurring expense created successfully (multi-currency)', {
      id: recurringExpense.id,
      descripcion: recurringExpense.descripcion,
      monto_ars: recurringExpense.monto_ars,
      monto_usd: recurringExpense.monto_usd,
      moneda_origen: recurringExpense.moneda_origen,
      frecuencia_id: recurringExpense.frecuencia_gasto_id
    });

    return recurringExpense;
  }

  /**
   * Update recurring expense with validation
   * Includes specific validation for recurring expense updates
   */
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Validate update data
    this.validateRecurringExpenseData(data, true);

    // Log important changes
    if (data.monto && data.monto !== existing.monto) {
      logger.info('Recurring expense amount updated', {
        id,
        oldAmount: existing.monto,
        newAmount: data.monto,
        descripcion: existing.descripcion
      });
    }

    if (data.activo === false && existing.activo === true) {
      logger.info('Recurring expense deactivated', {
        id,
        descripcion: existing.descripcion
      });
    }

    return super.update(id, data);
  }

  /**
   * Find active recurring expenses (for generation process)
   */
  async findActive() {
    return this.findAll({
      where: { activo: true }
    });
  }

  /**
   * Find recurring expenses by frequency
   */
  async findByFrequency(frecuenciaId) {
    return this.findAll({
      where: { frecuencia_gasto_id: frecuenciaId }
    });
  }

  /**
   * Find recurring expenses ready for generation today with advanced logic
   * Handles different frequencies, edge cases, and provides tolerance for missed dates
   * @param {number|null} userId - ID del usuario para filtrar (null = todos los usuarios)
   */
  async findReadyForGeneration(userId = null) {
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const diaActual = today.date();
    const mesActual = today.month() + 1;
    const anoActual = today.year();

    logger.debug('Starting recurring expense generation check', {
      today: today.format('YYYY-MM-DD'),
      dia: diaActual,
      mes: mesActual,
      ano: anoActual,
      userId: userId || 'all'
    });

    // Build where clause with optional user filter
    const whereClause = { activo: true };
    if (userId) {
      whereClause.usuario_id = userId;
    }

    // Optimized query: get active expenses with frequency data
    const activeExpenses = await this.model.findAll({
      where: whereClause,
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });

    const readyExpenses = [];

    for (const expense of activeExpenses) {
      try {
        const shouldGenerate = await this.shouldGenerateExpense(expense, today);
        if (shouldGenerate.canGenerate) {
          // Keep the Sequelize instance, add metadata as properties
          expense.generationReason = shouldGenerate.reason;
          expense.adjustedDate = shouldGenerate.adjustedDate;
          readyExpenses.push(expense);
        }
      } catch (error) {
        logger.error('Error checking expense generation readiness', {
          expenseId: expense.id,
          error: error.message
        });
      }
    }

    logger.info('Recurring expense generation check completed', {
      totalActive: activeExpenses.length,
      readyForGeneration: readyExpenses.length
    });

    return readyExpenses;
  }

  /**
   * Find recurring expenses ready for MANUAL generation (no tolerance restriction)
   * Used by manual "Procesar Pendientes" button - generates all pending for current month
   * @param {number|null} userId - ID del usuario para filtrar (null = todos los usuarios)
   */
  async findReadyForManualGeneration(userId = null) {
    const today = moment().tz('America/Argentina/Buenos_Aires');

    logger.debug('Finding recurring expenses for MANUAL generation (no tolerance)', {
      date: today.format('YYYY-MM-DD'),
      day: today.date(),
      userId: userId || 'all'
    });

    // Build where clause with optional user filter
    const whereClause = { activo: true };
    if (userId) {
      whereClause.usuario_id = userId;
    }

    const activeExpenses = await this.model.findAll({
      where: whereClause,
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });

    const readyExpenses = [];

    for (const expense of activeExpenses) {
      try {
        const shouldGenerate = await this.shouldGenerateForManual(expense, today);
        if (shouldGenerate.canGenerate) {
          expense.generationReason = shouldGenerate.reason;
          expense.adjustedDate = shouldGenerate.adjustedDate;
          readyExpenses.push(expense);

          logger.debug('Recurring expense ready for MANUAL generation', {
            expense_id: expense.id,
            descripcion: expense.descripcion,
            reason: shouldGenerate.reason,
            dia_de_pago: expense.dia_de_pago
          });
        }
      } catch (error) {
        logger.error('Error checking recurring expense for manual generation', {
          expense_id: expense.id,
          error: error.message
        });
      }
    }

    logger.info('Recurring expenses ready for MANUAL generation', {
      total_active: activeExpenses.length,
      ready_count: readyExpenses.length,
      ready_expenses: readyExpenses.map(e => ({
        id: e.id,
        descripcion: e.descripcion,
        dia_de_pago: e.dia_de_pago,
        reason: e.generationReason
      }))
    });

    return readyExpenses;
  }

  /**
   * Check if expense should generate for MANUAL processing
   * No tolerance - generates if dia_de_pago <= today and not yet generated this month
   * @param {Object} expense - The recurring expense
   * @param {moment.Moment} today - Current date
   * @returns {Object} Generation decision with reason
   */
  async shouldGenerateForManual(expense, today) {
    const result = {
      canGenerate: false,
      reason: '',
      adjustedDate: null
    };

    const frecuencia = expense.frecuencia;
    if (!frecuencia) {
      result.reason = 'No frequency defined';
      return result;
    }

    const frecuenciaNombre = frecuencia.nombre_frecuencia?.toLowerCase() || 'mensual';

    // Check if already generated this period
    if (expense.ultima_fecha_generado) {
      const ultimaFecha = moment(expense.ultima_fecha_generado);

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
      }
    }

    // Check start date
    if (expense.fecha_inicio) {
      const fechaInicio = moment(expense.fecha_inicio);
      if (today.isBefore(fechaInicio, 'day')) {
        result.reason = 'Start date not reached';
        return result;
      }
    }

    // For manual processing of monthly frequency: check if dia_de_pago has passed
    if (frecuenciaNombre === 'mensual') {
      const targetDay = expense.dia_de_pago;
      const todayDay = today.date();
      const adjustedDate = this.getValidMonthlyDate(today, targetDay);

      if (targetDay <= todayDay) {
        // Check if the adjusted date is on or after fecha_inicio
        if (expense.fecha_inicio) {
          const fechaInicio = moment(expense.fecha_inicio);
          if (adjustedDate.isBefore(fechaInicio, 'day')) {
            result.reason = `Manual: target day ${targetDay} this month is before fecha_inicio`;
            return result;
          }
        }

        result.canGenerate = true;
        result.reason = `Manual: payment day ${targetDay} <= today ${todayDay}`;
        result.adjustedDate = adjustedDate.format('YYYY-MM-DD');
        return result;
      }

      result.reason = `Payment day ${targetDay} > today ${todayDay}`;
      return result;
    }

    // For other frequencies, use the regular check
    const frequencyCheck = this.checkFrequencyMatch(expense, today, frecuencia);
    result.canGenerate = frequencyCheck.matches;
    result.reason = frequencyCheck.reason;
    result.adjustedDate = frequencyCheck.adjustedDate;

    return result;
  }

  /**
   * Advanced logic to determine if an expense should be generated
   * Handles multiple frequencies and edge cases
   */
  async shouldGenerateExpense(expense, today) {
    const result = {
      canGenerate: false,
      reason: '',
      adjustedDate: null
    };

    // Get frequency information first to determine how to check duplicates
    const frecuencia = expense.frecuencia;
    if (!frecuencia) {
      result.reason = 'No frequency defined';
      return result;
    }

    // Check if already generated (period depends on frequency)
    if (expense.ultima_fecha_generado) {
      const ultimaFecha = moment(expense.ultima_fecha_generado);
      const frecuenciaNombre = frecuencia.nombre_frecuencia?.toLowerCase();

      // For monthly/biweekly frequencies, check if already generated this month
      if (frecuenciaNombre === 'mensual' || frecuenciaNombre === 'quincenal') {
        if (ultimaFecha.isSame(today, 'month') && ultimaFecha.isSame(today, 'year')) {
          result.reason = 'Already generated this month';
          return result;
        }
      } else if (frecuenciaNombre === 'semanal') {
        // For weekly, check if already generated this week
        if (ultimaFecha.isSame(today, 'week') && ultimaFecha.isSame(today, 'year')) {
          result.reason = 'Already generated this week';
          return result;
        }
      } else if (frecuenciaNombre === 'diaria') {
        // For daily, check if already generated today
        if (ultimaFecha.isSame(today, 'day')) {
          result.reason = 'Already generated today';
          return result;
        }
      }
    }

    // Check start date
    if (expense.fecha_inicio) {
      const fechaInicio = moment(expense.fecha_inicio);
      if (today.isBefore(fechaInicio, 'day')) {
        result.reason = 'Start date not reached';
        return result;
      }
    }

    // Handle different frequency types
    const frequencyCheck = this.checkFrequencyMatch(expense, today, frecuencia);

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
   * Check if current date matches the frequency pattern
   */
  checkFrequencyMatch(expense, today, frecuencia) {
    const diaActual = today.date();
    const mesActual = today.month() + 1;

    switch (frecuencia.nombre_frecuencia?.toLowerCase()) {
    case 'único':
    case 'unico':
      return {
        matches: false,
        reason: 'One-time frequency - should not generate recurring expenses',
        adjustedDate: null
      };

    case 'diario':
      return {
        matches: true,
        reason: 'Daily frequency - generate every day',
        adjustedDate: today.format('YYYY-MM-DD')
      };

    case 'semanal':
      // Generate every 7 days from last generation or start date
      return this.checkWeeklyFrequency(expense, today);

    case 'quincenal':
      // Generate on 1st and 15th of each month
      return this.checkBiweeklyFrequency(expense, today, diaActual);

    case 'mensual':
      return this.checkMonthlyFrequency(expense, today, diaActual);

    case 'bimestral':
      return this.checkBimonthlyFrequency(expense, today, diaActual, mesActual);

    case 'trimestral':
      return this.checkQuarterlyFrequency(expense, today, diaActual, mesActual);

    case 'semestral':
      return this.checkSemiannualFrequency(expense, today, diaActual, mesActual);

    case 'anual':
      return this.checkAnnualFrequency(expense, today, diaActual, mesActual);

    default:
      return {
        matches: false,
        reason: `Unknown frequency: ${frecuencia.nombre_frecuencia}`,
        adjustedDate: null
      };
    }
  }

  /**
   * Check weekly frequency (every 7 days)
   */
  checkWeeklyFrequency(expense, today) {
    if (!expense.ultima_fecha_generado) {
      return {
        matches: true,
        reason: 'First weekly generation',
        adjustedDate: today.format('YYYY-MM-DD')
      };
    }

    const lastGeneration = moment(expense.ultima_fecha_generado);
    const daysSince = today.diff(lastGeneration, 'days');

    if (daysSince >= 7) {
      return {
        matches: true,
        reason: `Weekly frequency - ${daysSince} days since last generation`,
        adjustedDate: today.format('YYYY-MM-DD')
      };
    }

    return {
      matches: false,
      reason: `Weekly frequency - only ${daysSince} days since last generation`,
      adjustedDate: null
    };
  }

  /**
   * Check biweekly frequency (1st and 15th of month)
   */
  checkBiweeklyFrequency(expense, today, diaActual) {
    const validDays = [1, 15];

    if (validDays.includes(diaActual)) {
      return {
        matches: true,
        reason: `Biweekly frequency - generating on day ${diaActual}`,
        adjustedDate: today.format('YYYY-MM-DD')
      };
    }

    // CATCH-UP LOGIC: If never generated and we're past one of the valid days
    // BUT only if that day is on or after fecha_inicio
    if (!expense.ultima_fecha_generado) {
      const lastValidDay = validDays.filter(d => d < diaActual).pop();
      if (lastValidDay) {
        const catchUpDate = today.clone().date(lastValidDay);
        // Check fecha_inicio constraint
        if (expense.fecha_inicio) {
          const fechaInicio = moment(expense.fecha_inicio);
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

    // Regular tolerance: if it's a few days past 1st or 15th and not generated yet
    const tolerance = this.calculateDateTolerance(diaActual, validDays);
    if (tolerance.withinTolerance) {
      return {
        matches: true,
        reason: `Biweekly frequency - tolerance applied for day ${tolerance.targetDay}`,
        adjustedDate: today.format('YYYY-MM-DD')
      };
    }

    return {
      matches: false,
      reason: `Biweekly frequency - not on 1st or 15th (current: ${diaActual})`,
      adjustedDate: null
    };
  }

  /**
   * Check monthly frequency with date adjustment for invalid dates
   */
  checkMonthlyFrequency(expense, today, diaActual) {
    const targetDay = expense.dia_de_pago;

    // Handle edge cases like day 31 in months with fewer days
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual === adjustedDay) {
      return {
        matches: true,
        reason: `Monthly frequency - exact match on day ${adjustedDay}`,
        adjustedDate: adjustedDate.format('YYYY-MM-DD')
      };
    }

    // CATCH-UP LOGIC: If never generated before and target day has passed this month
    // BUT only if the target day this month is ON or AFTER fecha_inicio
    if (!expense.ultima_fecha_generado && diaActual > adjustedDay) {
      // If there's a fecha_inicio, check if the target day this month was after fecha_inicio
      if (expense.fecha_inicio) {
        const fechaInicio = moment(expense.fecha_inicio);
        // The adjusted date (target day this month) must be on or after fecha_inicio
        // Otherwise, the first generation should be next month
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

    // Regular tolerance for missed dates (3 days)
    const tolerance = this.calculateDateTolerance(diaActual, [adjustedDay]);
    if (tolerance.withinTolerance) {
      return {
        matches: true,
        reason: `Monthly frequency - tolerance applied for day ${targetDay} (adjusted to ${adjustedDay})`,
        adjustedDate: today.format('YYYY-MM-DD')
      };
    }

    return {
      matches: false,
      reason: `Monthly frequency - target day ${targetDay} (adjusted to ${adjustedDay}), current ${diaActual}`,
      adjustedDate: null
    };
  }

  /**
   * Check bimonthly frequency (every 2 months)
   */
  checkBimonthlyFrequency(expense, today, diaActual, _mesActual) {
    const targetDay = expense.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return {
        matches: false,
        reason: `Bimonthly frequency - wrong day ${diaActual}, expected ${adjustedDay}`,
        adjustedDate: null
      };
    }

    // Check if it's been 2 months since last generation
    if (!expense.ultima_fecha_generado) {
      return {
        matches: true,
        reason: 'First bimonthly generation',
        adjustedDate: adjustedDate.format('YYYY-MM-DD')
      };
    }

    const lastGeneration = moment(expense.ultima_fecha_generado);
    const monthsSince = today.diff(lastGeneration, 'months');

    if (monthsSince >= 2) {
      return {
        matches: true,
        reason: `Bimonthly frequency - ${monthsSince} months since last generation`,
        adjustedDate: adjustedDate.format('YYYY-MM-DD')
      };
    }

    return {
      matches: false,
      reason: `Bimonthly frequency - only ${monthsSince} months since last generation`,
      adjustedDate: null
    };
  }

  /**
   * Check quarterly frequency (every 3 months)
   */
  checkQuarterlyFrequency(expense, today, diaActual, mesActual) {
    const targetDay = expense.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return {
        matches: false,
        reason: `Quarterly frequency - wrong day ${diaActual}, expected ${adjustedDay}`,
        adjustedDate: null
      };
    }

    // Check if current month is a quarter month (1, 4, 7, 10)
    const quarterMonths = [1, 4, 7, 10];
    if (!quarterMonths.includes(mesActual)) {
      return {
        matches: false,
        reason: `Quarterly frequency - not a quarter month (${mesActual})`,
        adjustedDate: null
      };
    }

    return {
      matches: true,
      reason: `Quarterly frequency - generating in quarter month ${mesActual}`,
      adjustedDate: adjustedDate.format('YYYY-MM-DD')
    };
  }

  /**
   * Check semiannual frequency (every 6 months)
   */
  checkSemiannualFrequency(expense, today, diaActual, mesActual) {
    const targetDay = expense.dia_de_pago;
    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual !== adjustedDay) {
      return {
        matches: false,
        reason: `Semiannual frequency - wrong day ${diaActual}, expected ${adjustedDay}`,
        adjustedDate: null
      };
    }

    // Check if current month is a semiannual month (1, 7)
    const semiannualMonths = [1, 7];
    if (!semiannualMonths.includes(mesActual)) {
      return {
        matches: false,
        reason: `Semiannual frequency - not a semiannual month (${mesActual})`,
        adjustedDate: null
      };
    }

    return {
      matches: true,
      reason: `Semiannual frequency - generating in month ${mesActual}`,
      adjustedDate: adjustedDate.format('YYYY-MM-DD')
    };
  }

  /**
   * Check annual frequency
   */
  checkAnnualFrequency(expense, today, diaActual, mesActual) {
    const targetDay = expense.dia_de_pago;
    const targetMonth = expense.mes_de_pago;

    if (!targetMonth) {
      return {
        matches: false,
        reason: 'Annual frequency requires mes_de_pago to be set',
        adjustedDate: null
      };
    }

    if (mesActual !== targetMonth) {
      return {
        matches: false,
        reason: `Annual frequency - wrong month ${mesActual}, expected ${targetMonth}`,
        adjustedDate: null
      };
    }

    const adjustedDate = this.getValidMonthlyDate(today, targetDay);
    const adjustedDay = adjustedDate.date();

    if (diaActual === adjustedDay) {
      return {
        matches: true,
        reason: `Annual frequency - exact match on ${mesActual}/${adjustedDay}`,
        adjustedDate: adjustedDate.format('YYYY-MM-DD')
      };
    }

    // Tolerance for annual frequency
    const tolerance = this.calculateDateTolerance(diaActual, [adjustedDay]);
    if (tolerance.withinTolerance) {
      return {
        matches: true,
        reason: `Annual frequency - tolerance applied for ${targetMonth}/${targetDay}`,
        adjustedDate: today.format('YYYY-MM-DD')
      };
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
    const month = today.month(); // 0-based

    // Create date with target day
    const targetDate = moment({ year, month, date: targetDay });

    // If the date is invalid (e.g., Feb 31), get last day of month
    if (!targetDate.isValid() || targetDate.date() !== targetDay) {
      return moment({ year, month }).endOf('month');
    }

    return targetDate;
  }

  /**
   * Calculate tolerance for missed dates (up to 3 days)
   */
  calculateDateTolerance(currentDay, validDays) {
    const tolerance = 3; // days

    for (const validDay of validDays) {
      const diff = currentDay - validDay;
      if (diff > 0 && diff <= tolerance) {
        return {
          withinTolerance: true,
          targetDay: validDay
        };
      }
    }

    return {
      withinTolerance: false,
      targetDay: null
    };
  }

  /**
   * Toggle active status of recurring expense
   */
  async toggleActive(id) {
    const expense = await this.findById(id);
    if (!expense) {
      return null;
    }

    const newStatus = !expense.activo;
    const updated = await this.update(id, { activo: newStatus });

    logger.info(`Recurring expense ${newStatus ? 'activated' : 'deactivated'}`, {
      id,
      descripcion: expense.descripcion,
      newStatus
    });

    return updated;
  }

  /**
   * Validate recurring expense data
   * @param {Object} data - Expense data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   */
  validateRecurringExpenseData(data, _isUpdate = false) {
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

    if (errors.length > 0) {
      const error = new Error('Validation failed for recurring expense');
      error.validationErrors = errors;
      throw error;
    }
  }
}
