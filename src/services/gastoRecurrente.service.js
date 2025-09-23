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
   * Find recurring expenses that should generate today
   * Used by the scheduler service
   */
  async findReadyForGeneration() {
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const diaActual = today.date();
    const mesActual = today.month() + 1;

    const activeExpenses = await this.findActive();

    return activeExpenses.filter(expense => {
      // Check if it's the payment day
      if (expense.dia_de_pago !== diaActual) {
        return false;
      }

      // For annual frequency, check month
      if (expense.mes_de_pago && expense.mes_de_pago !== mesActual) {
        return false;
      }

      // Check if already generated today
      if (expense.ultima_fecha_generado) {
        const ultimaFecha = moment(expense.ultima_fecha_generado);
        if (ultimaFecha.isSame(today, 'day')) {
          return false;
        }
      }

      // Check start date
      if (expense.fecha_inicio) {
        const fechaInicio = moment(expense.fecha_inicio);
        if (today.isBefore(fechaInicio, 'day')) {
          return false;
        }
      }

      return true;
    });
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