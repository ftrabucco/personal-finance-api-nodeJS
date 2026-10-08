import { RecurringIncomeStrategy } from '../strategies/incomeGeneration/recurringIncomeStrategy.js';
import { IngresoRecurrenteService } from './ingresoRecurrente.service.js';
import sequelize from '../db/postgres.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Generates IngresoUnico occurrences from IngresoRecurrente sources.
 * Mirrors GastoGeneratorService's shape (lock → re-validate under lock →
 * generate → commit/rollback, plus a scheduled-batch entry point), scoped
 * to the one income source type that exists today.
 */
export class IngresoGeneratorService {
  static ingresoRecurrenteService = new IngresoRecurrenteService();

  /**
   * Generate from a single ingreso recurrente, with the same race-prevention
   * pattern as GastoGeneratorService.generateFromGastoRecurrente: locks the
   * source row for the transaction and re-validates against the freshly-
   * locked row before generating, so two overlapping calls (a scheduled run
   * overlapping a manual "Procesar Pendientes") can't both generate the
   * same occurrence.
   *
   * @param {Object} ingresoRecurrente - The recurring income source
   * @param {boolean} allowCatchUp - If true, backfill missed monthly occurrences
   * @returns {Promise<Object[]>} Generated IngresoUnico rows (possibly empty)
   */
  static async generateFromIngresoRecurrente(ingresoRecurrente, allowCatchUp = false) {
    const transaction = await sequelize.transaction();
    try {
      const lockedIncome = await this.ingresoRecurrenteService.lockForGeneration(ingresoRecurrente.id, transaction);

      if (!lockedIncome) {
        await transaction.commit();
        return [];
      }

      const today = moment().tz('America/Argentina/Buenos_Aires');
      const stillReady = await this.ingresoRecurrenteService.shouldGenerateIncome(lockedIncome, today);

      if (!stillReady.canGenerate) {
        await transaction.commit();
        logger.debug('Ingreso recurrente ya no está listo para generar (carrera evitada):', {
          ingresoRecurrente_id: ingresoRecurrente.id,
          reason: stillReady.reason
        });
        return [];
      }

      const strategy = new RecurringIncomeStrategy();
      const generated = allowCatchUp
        ? await strategy.generateCatchUp(lockedIncome, transaction)
        : [await strategy.generateWithDate(lockedIncome, stillReady.adjustedDate || today.format('YYYY-MM-DD'), transaction)].filter(Boolean);

      await transaction.commit();

      logger.info('Ingreso(s) generado(s) desde ingreso recurrente:', {
        ingresoRecurrente_id: ingresoRecurrente.id,
        occurrences_generated: generated.length,
        allowCatchUp
      });

      return generated;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar ingreso desde ingreso recurrente:', {
        error: error.message,
        ingresoRecurrente_id: ingresoRecurrente.id
      });
      throw error;
    }
  }

  /**
   * Loops every ingreso recurrente ready for generation and generates each,
   * in the same {success, errors} shape GastoGeneratorService uses so the
   * caller (scheduler or manual endpoint) can fold both into one summary.
   * @param {number|null} userId - null = all users (scheduler)
   * @param {boolean} allowCatchUp
   */
  static async generateScheduledIncomes(userId = null, allowCatchUp = false) {
    const results = { success: [], errors: [] };

    const readyIncomes = await this.ingresoRecurrenteService.findReadyForGeneration(userId);

    logger.debug('Processing recurring incomes', { count: readyIncomes.length });

    for (const income of readyIncomes) {
      try {
        const generated = await this.generateFromIngresoRecurrente(income, allowCatchUp);
        for (const ingresoUnico of generated) {
          results.success.push({
            type: 'ingreso_recurrente',
            id: ingresoUnico.id,
            source_id: income.id,
            monto_ars: ingresoUnico.monto_ars,
            descripcion: income.descripcion
          });
        }
      } catch (error) {
        results.errors.push({
          type: 'ingreso_recurrente',
          id: income.id,
          error: error.message,
          descripcion: income.descripcion
        });
      }
    }

    logger.info('Scheduled income generation completed', {
      total_success: results.success.length,
      total_errors: results.errors.length
    });

    return results;
  }
}
