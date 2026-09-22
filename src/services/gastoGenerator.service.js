import { GastoUnico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../models/index.js';
import { ImmediateExpenseStrategy } from '../strategies/expenseGeneration/immediateStrategy.js';
import { RecurringExpenseStrategy } from '../strategies/expenseGeneration/recurringStrategy.js';
import { AutomaticDebitExpenseStrategy } from '../strategies/expenseGeneration/automaticDebitStrategy.js';
import { InstallmentExpenseStrategy } from '../strategies/expenseGeneration/installmentStrategy.js';
import { GastoRecurrenteService } from './gastoRecurrente.service.js';
import { DebitoAutomaticoService } from './debitoAutomatico.service.js';
import { ComprasService } from './compras.service.js';
import sequelize from '../db/postgres.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Servicio principal para generación de gastos reales desde diferentes fuentes
 * Implementa Strategy Pattern para cada tipo de gasto
 */
export class GastoGeneratorService {
  // Service instances for dependency injection
  static gastoRecurrenteService = new GastoRecurrenteService();
  static debitoAutomaticoService = new DebitoAutomaticoService();
  static comprasService = new ComprasService();

  /**
   * Genera un gasto real desde un gasto único
   * Usa ImmediateExpenseStrategy
   */
  static async generateFromGastoUnico(gastoUnico) {
    const transaction = await sequelize.transaction();
    try {
      // Same race-prevention pattern as the scheduled generators: lock the
      // row and re-check `procesado` under the lock before generating, so
      // two overlapping manual-generation calls can't both process it.
      const lockedGastoUnico = await GastoUnico.findByPk(gastoUnico.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!lockedGastoUnico || lockedGastoUnico.procesado) {
        await transaction.commit();
        return null;
      }

      const immediateStrategy = new ImmediateExpenseStrategy();
      const gasto = await immediateStrategy.generate(lockedGastoUnico, transaction);

      // Marcar como procesado
      await lockedGastoUnico.update({ procesado: true }, { transaction });

      await transaction.commit();
      logger.info('Gasto generado desde gasto único con estrategia:', {
        gasto_id: gasto.id,
        gastoUnico_id: gastoUnico.id
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde gasto único:', {
        error: error.message,
        gastoUnico_id: gastoUnico.id
      });
      throw error;
    }
  }

  /**
   * Genera un gasto real desde un gasto recurrente
   * Usa RecurringExpenseStrategy
   *
   * Locks the gasto recurrente row for the duration of the transaction and
   * re-validates shouldGenerate against the freshly-locked row before
   * generating. findReadyForGeneration's own check runs outside any
   * transaction, so two overlapping /gastos/generate calls (e.g. a scheduled
   * run overlapping a manual "generate now" click) could otherwise both read
   * "not generated yet" and both insert a gasto for the same period. The row
   * lock forces the second call to wait for the first to commit, then
   * re-check against post-commit state.
   */
  static async generateFromGastoRecurrente(gastoRecurrente) {
    const transaction = await sequelize.transaction();
    try {
      const lockedExpense = await this.gastoRecurrenteService.lockForGeneration(gastoRecurrente.id, transaction);

      if (!lockedExpense) {
        await transaction.commit();
        return null;
      }

      const today = moment().tz('America/Argentina/Buenos_Aires');
      const stillReady = await this.gastoRecurrenteService.shouldGenerateExpense(lockedExpense, today);

      if (!stillReady.canGenerate) {
        await transaction.commit();
        logger.debug('Gasto recurrente ya no está listo para generar (carrera evitada):', {
          gastoRecurrente_id: gastoRecurrente.id,
          reason: stillReady.reason
        });
        return null;
      }

      const recurringStrategy = new RecurringExpenseStrategy();
      const targetDate = stillReady.adjustedDate || today.format('YYYY-MM-DD');

      const gasto = await recurringStrategy.generateWithDate(lockedExpense, targetDate, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde gasto recurrente con estrategia:', {
        gasto_id: gasto.id,
        gastoRecurrente_id: gastoRecurrente.id,
        frecuencia: lockedExpense.frecuencia?.nombre_frecuencia,
        fecha_generada: targetDate,
        is_catchup: !!stillReady.adjustedDate
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde gasto recurrente:', {
        error: error.message,
        gastoRecurrente_id: gastoRecurrente.id
      });
      throw error;
    }
  }

  /**
   * Genera un gasto real desde un débito automático
   * Usa AutomaticDebitExpenseStrategy
   *
   * Same race-prevention pattern as generateFromGastoRecurrente: locks the
   * source row for the transaction and re-validates before generating.
   */
  static async generateFromDebitoAutomatico(debitoAutomatico) {
    const transaction = await sequelize.transaction();
    try {
      const lockedDebito = await this.debitoAutomaticoService.lockForGeneration(debitoAutomatico.id, transaction);

      if (!lockedDebito) {
        await transaction.commit();
        return null;
      }

      const today = moment().tz('America/Argentina/Buenos_Aires');
      const stillReady = await this.debitoAutomaticoService.shouldGenerateExpense(lockedDebito, today);

      if (!stillReady.should) {
        await transaction.commit();
        logger.debug('Débito automático ya no está listo para generar (carrera evitada):', {
          debitoAutomatico_id: debitoAutomatico.id,
          reason: stillReady.reason
        });
        return null;
      }

      const automaticDebitStrategy = new AutomaticDebitExpenseStrategy();
      const gasto = await automaticDebitStrategy.generate(lockedDebito, transaction, stillReady.adjustedDate);

      await transaction.commit();
      logger.info('Gasto generado desde débito automático con estrategia:', {
        gasto_id: gasto.id,
        debitoAutomatico_id: debitoAutomatico.id,
        frecuencia: lockedDebito.frecuencia?.nombre_frecuencia
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde débito automático:', {
        error: error.message,
        debitoAutomatico_id: debitoAutomatico.id
      });
      throw error;
    }
  }

  /**
   * Genera un gasto real desde una compra (cuotas)
   * Usa InstallmentExpenseStrategy
   *
   * Same race-prevention pattern as generateFromGastoRecurrente/
   * generateFromDebitoAutomatico: locks the compra row for the transaction
   * and re-runs shouldGenerate against the freshly-locked row (which also
   * recomputes nextInstallmentNumber/adjustedDate) before generating.
   */
  static async generateFromCompra(compra, allowCatchUp = true) {
    const transaction = await sequelize.transaction();
    try {
      const lockedCompra = await this.comprasService.lockForGeneration(compra.id, transaction);

      if (!lockedCompra) {
        await transaction.commit();
        return null;
      }

      const installmentStrategy = new InstallmentExpenseStrategy();
      const stillReady = await installmentStrategy.shouldGenerate(lockedCompra, allowCatchUp);

      if (!stillReady) {
        await transaction.commit();
        logger.debug('Compra ya no está lista para generar cuota (carrera evitada):', {
          compra_id: compra.id
        });
        return null;
      }

      // Validar foreign keys requeridos
      const missingKeys = this.validateCompraForeignKeys(lockedCompra);
      if (missingKeys.length > 0) {
        await transaction.rollback();
        const error = new Error(`Missing required foreign keys: ${missingKeys.join(', ')}`);
        logger.error('Foreign key validation failed:', {
          compra_id: compra.id,
          missing_keys: missingKeys
        });
        throw error;
      }

      const gasto = await installmentStrategy.generate(lockedCompra, transaction);

      await transaction.commit();

      if (gasto) {
        logger.info('Gasto generado desde compra con estrategia:', {
          gasto_id: gasto.id,
          compra_id: compra.id,
          monto: gasto.monto_ars
        });
      }
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde compra:', {
        error: error.message,
        compra_id: compra.id
      });
      throw error;
    }
  }

  /**
   * Valida que la compra tenga todas las foreign keys requeridas
   */
  static validateCompraForeignKeys(compra) {
    const missingKeys = [];
    if (!compra.categoria_gasto_id) missingKeys.push('categoria_gasto_id');
    if (!compra.importancia_gasto_id) missingKeys.push('importancia_gasto_id');
    if (!compra.tipo_pago_id) missingKeys.push('tipo_pago_id');
    return missingKeys;
  }

  /**
   * Genera gastos pendientes programados (NO incluye gastos únicos)
   * Los gastos únicos se procesan inmediatamente al crearlos
   * Usado por el scheduler automático con procesamiento optimizado
   * @param {number|null} userId - ID del usuario para filtrar gastos (null = todos los usuarios, para scheduler)
   * @param {boolean} allowCatchUp - Si true, genera cuotas cuya fecha ya pasó (para generación manual)
   */
  static async generateScheduledExpenses(userId = null, allowCatchUp = false) {
    const startTime = Date.now();
    const results = {
      success: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        processing_time_ms: 0,
        breakdown: {
          recurrentes: { processed: 0, generated: 0, skipped: 0, errors: 0 },
          debitos: { processed: 0, generated: 0, skipped: 0, errors: 0 },
          compras: { processed: 0, generated: 0, skipped: 0, errors: 0 }
        }
      }
    };

    try {
      logger.info('Starting scheduled expense generation process', { userId: userId || 'all' });

      // Process recurring expenses with improved logging
      const gastosRecurrentes = await this.gastoRecurrenteService.findReadyForGeneration(userId);
      results.summary.breakdown.recurrentes.processed = gastosRecurrentes.length;

      logger.debug('Processing recurring expenses', {
        count: gastosRecurrentes.length,
        expenses: gastosRecurrentes.map(g => ({
          id: g.id,
          descripcion: g.descripcion,
          reason: g.generationReason,
          adjustedDate: g.adjustedDate
        }))
      });

      await this.processExpensesBatch(
        gastosRecurrentes,
        'recurrente',
        this.generateFromGastoRecurrente,
        results
      );

      // Process automatic debits with improved logging
      const debitosAutomaticos = await this.debitoAutomaticoService.findReadyForGeneration(userId);
      results.summary.breakdown.debitos.processed = debitosAutomaticos.length;

      logger.debug('Processing automatic debits', {
        count: debitosAutomaticos.length
      });

      await this.processExpensesBatch(
        debitosAutomaticos,
        'debito',
        this.generateFromDebitoAutomatico,
        results
      );

      // Process installment purchases with improved logging
      const compras = await this.comprasService.findReadyForGeneration(userId, allowCatchUp);
      results.summary.breakdown.compras.processed = compras.length;

      logger.debug('Processing installment purchases', {
        count: compras.length
      });

      await this.processExpensesBatch(
        compras,
        'compra',
        (expense) => this.generateFromCompra(expense, allowCatchUp),
        results
      );

      // Calculate final metrics
      const endTime = Date.now();
      results.summary.processing_time_ms = endTime - startTime;
      results.summary.totalProcessed = results.success.length + results.errors.length;

      // Update breakdown totals
      for (const type of ['recurrentes', 'debitos', 'compras']) {
        const breakdown = results.summary.breakdown[type];
        breakdown.generated = results.success.filter(r => r.type === type.slice(0, -1)).length;
        breakdown.errors = results.errors.filter(r => r.type === type.slice(0, -1)).length;
        breakdown.skipped = breakdown.processed - breakdown.generated - breakdown.errors;
      }

      logger.info('Scheduled expense generation completed successfully', {
        total_success: results.success.length,
        total_errors: results.errors.length,
        processing_time_ms: results.summary.processing_time_ms,
        breakdown: results.summary.breakdown
      });

      return results;
    } catch (error) {
      const endTime = Date.now();
      results.summary.processing_time_ms = endTime - startTime;

      logger.error('Fatal error in scheduled expense generation', {
        error: error.message,
        stack: error.stack,
        processing_time_ms: results.summary.processing_time_ms,
        partial_results: results.summary
      });
      throw error;
    }
  }

  /**
   * Process a batch of expenses with parallel processing and detailed error handling
   */
  static async processExpensesBatch(expenses, type, generatorFunction, results) {
    const batchStartTime = Date.now();

    // Process in smaller batches to avoid overwhelming the database
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < expenses.length; i += batchSize) {
      batches.push(expenses.slice(i, i + batchSize));
    }

    for (const [batchIndex, batch] of batches.entries()) {
      logger.debug(`Processing ${type} batch ${batchIndex + 1}/${batches.length}`, {
        batchSize: batch.length,
        items: batch.map(item => ({ id: item.id, descripcion: item.descripcion }))
      });

      // Process batch items in parallel
      const batchPromises = batch.map(async (expense) => {
        try {
          const gasto = await generatorFunction.call(this, expense);
          if (gasto) {
            const successItem = {
              type: type === 'recurrente' ? 'recurrente' : type,
              id: gasto.id,
              source_id: expense.id,
              monto: gasto.monto_ars,
              descripcion: expense.descripcion,
              generationReason: expense.generationReason || 'Standard generation',
              adjustedDate: expense.adjustedDate
            };
            results.success.push(successItem);

            logger.debug(`Successfully generated ${type} expense`, {
              source_id: expense.id,
              gasto_id: gasto.id,
              monto: gasto.monto_ars,
              reason: expense.generationReason
            });
          } else {
            logger.debug(`${type} expense generation skipped`, {
              source_id: expense.id,
              reason: 'Generator returned null (should not generate today)'
            });
          }
        } catch (error) {
          const errorItem = {
            type: type === 'recurrente' ? 'recurrente' : type,
            id: expense.id,
            error: error.message,
            descripcion: expense.descripcion,
            timestamp: new Date().toISOString()
          };
          results.errors.push(errorItem);

          logger.error(`Error generating ${type} expense`, {
            source_id: expense.id,
            descripcion: expense.descripcion,
            error: error.message,
            stack: error.stack
          });
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Small delay between batches to prevent overwhelming the database
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const batchEndTime = Date.now();
    logger.debug(`Completed ${type} batch processing`, {
      total_items: expenses.length,
      batches_count: batches.length,
      processing_time_ms: batchEndTime - batchStartTime
    });
  }

  /**
   * Método legacy para compatibilidad con endpoint manual
   * Incluye gastos únicos para procesamiento manual
   * @param {number} userId - ID del usuario para filtrar gastos (requerido para endpoint manual)
   */
  static async generatePendingExpenses(userId) {
    const results = {
      success: [],
      errors: [],
      summary: null
    };

    try {
      // Generar gastos programados (recurrentes, débitos, compras)
      // allowCatchUp: true para que genere cuotas atrasadas al ejecutar manualmente
      const scheduledResults = await this.generateScheduledExpenses(userId, true);
      results.success.push(...scheduledResults.success);
      results.errors.push(...scheduledResults.errors);
      results.summary = scheduledResults.summary;

      // Procesar gastos únicos pendientes (para endpoint manual únicamente)
      const whereClause = { procesado: false };
      if (userId) {
        whereClause.usuario_id = userId;
      }

      const gastosUnicos = await GastoUnico.findAll({
        where: whereClause,
        include: [
          { model: CategoriaGasto, as: 'categoria' },
          { model: ImportanciaGasto, as: 'importancia' },
          { model: TipoPago, as: 'tipoPago' },
          { model: Tarjeta, as: 'tarjeta' }
        ]
      });

      for (const gastoUnico of gastosUnicos) {
        try {
          const gasto = await this.generateFromGastoUnico(gastoUnico);
          if (gasto) {
            results.success.push({
              type: 'unico',
              id: gasto.id,
              source_id: gastoUnico.id
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'unico',
            id: gastoUnico.id,
            error: error.message
          });
        }
      }

      logger.info('Generación completa de gastos completada (incluye únicos)', {
        total_success: results.success.length,
        total_errors: results.errors.length,
        breakdown: {
          recurrentes: results.success.filter(r => r.type === 'recurrente').length,
          debitos: results.success.filter(r => r.type === 'debito').length,
          compras: results.success.filter(r => r.type === 'compra').length,
          unicos: results.success.filter(r => r.type === 'unico').length
        }
      });
      return results;
    } catch (error) {
      logger.error('Error en la generación completa de gastos:', {
        error: error.message
      });
      throw error;
    }
  }
}
