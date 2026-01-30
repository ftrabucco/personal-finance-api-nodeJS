import { BaseRecurringStrategy } from './baseRecurringStrategy.js';
import { Gasto } from '../../models/index.js';

/**
 * Estrategia para gastos recurrentes - Generación programada
 * Se ejecuta cuando corresponde según la frecuencia y fecha configurada
 * Utiliza BaseRecurringStrategy para eliminar duplicación de código
 */
export class RecurringExpenseStrategy extends BaseRecurringStrategy {
  constructor() {
    super();
    this.Gasto = Gasto;
  }

  async generate(gastoRecurrente, transaction = null) {
    return this.generateRecurringExpense(gastoRecurrente, {
      frecuencia_gasto_id: gastoRecurrente.frecuencia_gasto_id
    }, transaction);
  }

  /**
   * Generate with a specific target date (for catch-up logic)
   * @param {Object} gastoRecurrente - The recurring expense source
   * @param {string} targetDate - Target date in YYYY-MM-DD format
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Generated expense
   */
  async generateWithDate(gastoRecurrente, targetDate, transaction = null) {
    return this.generateRecurringExpenseWithDate(gastoRecurrente, {
      frecuencia_gasto_id: gastoRecurrente.frecuencia_gasto_id
    }, targetDate, transaction);
  }

  getType() {
    return 'recurrente';
  }
}
