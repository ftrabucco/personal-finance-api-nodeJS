import { BaseService } from './base.service.js';
import { GastoRecurrente, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
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
   */
  async create(data) {
    // Validate recurring expense specific rules
    this.validateRecurringExpenseData(data);

    // Set default values for recurring expenses
    const processedData = {
      ...data,
      activo: data.activo ?? true,
      ultima_fecha_generado: null
    };

    const recurringExpense = await super.create(processedData);

    logger.info('Recurring expense created successfully', {
      id: recurringExpense.id,
      descripcion: recurringExpense.descripcion,
      monto: recurringExpense.monto,
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
   */
  async findReadyForGeneration() {
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const diaActual = today.date();
    const mesActual = today.month() + 1;
    const anoActual = today.year();

    logger.debug('Starting recurring expense generation check', {
      today: today.format('YYYY-MM-DD'),
      dia: diaActual,
      mes: mesActual,
      ano: anoActual
    });

    // Optimized query: get active expenses with frequency data
    const activeExpenses = await this.model.findAll({
      where: { activo: true },
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
          readyExpenses.push({
            ...expense.toJSON(),
            generationReason: shouldGenerate.reason,
            adjustedDate: shouldGenerate.adjustedDate
          });
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
   * Advanced logic to determine if an expense should be generated
   * Handles multiple frequencies and edge cases
   */
  async shouldGenerateExpense(expense, today) {
    const result = {
      canGenerate: false,
      reason: '',
      adjustedDate: null
    };

    // Check if already generated today
    if (expense.ultima_fecha_generado) {
      const ultimaFecha = moment(expense.ultima_fecha_generado);
      if (ultimaFecha.isSame(today, 'day')) {
        result.reason = 'Already generated today';
        return result;
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

    // Get frequency information
    const frecuencia = expense.frecuencia;
    if (!frecuencia) {
      result.reason = 'No frequency defined';
      return result;
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
    const diaSemanaActual = today.day(); // 0 = Sunday, 1 = Monday, etc.

    switch (frecuencia.nombre?.toLowerCase()) {
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
        reason: `Unknown frequency: ${frecuencia.nombre}`,
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

    // Tolerance: if it's a few days past 1st or 15th and not generated yet
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

    // Tolerance for missed dates
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
  checkBimonthlyFrequency(expense, today, diaActual, mesActual) {
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
  validateRecurringExpenseData(data, isUpdate = false) {
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
