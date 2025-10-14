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

  getType() {
    return 'recurrente';
  }
}
