import { BaseRecurringStrategy } from './baseRecurringStrategy.js';
import { Gasto } from '../../models/index.js';
import moment from 'moment-timezone';

/**
 * Estrategia para débitos automáticos - Generación programada
 * Se ejecuta cuando corresponde según la frecuencia y fecha configurada
 * Utiliza BaseRecurringStrategy para eliminar duplicación de código
 *
 * La diferencia con gastos recurrentes es que los débitos automáticos
 * pueden tener fecha_fin para limitar su ejecución
 */
export class AutomaticDebitExpenseStrategy extends BaseRecurringStrategy {
  constructor() {
    super();
    this.Gasto = Gasto;
  }

  async generate(debitoAutomatico, transaction = null) {
    return this.generateRecurringExpense(debitoAutomatico, {
      frecuencia_gasto_id: debitoAutomatico.frecuencia_gasto_id
    }, transaction);
  }

  /**
   * Override to include fecha_fin validation specific to automatic debits
   * @param {Object} source - The automatic debit source object
   * @param {moment.Moment} today - Current date
   * @returns {boolean} True if within valid date range
   */
  validateDateBoundaries(source, today) {
    // Call parent validation first (handles fecha_inicio)
    if (!super.validateDateBoundaries(source, today)) {
      return false;
    }

    // Additional validation for fecha_fin (specific to automatic debits)
    if (source.fecha_fin) {
      const fechaFin = moment(source.fecha_fin);
      if (today.isAfter(fechaFin, 'day')) {
        return false;
      }
    }

    return true;
  }

  getType() {
    return 'debito_automatico';
  }
}