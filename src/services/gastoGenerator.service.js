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
      const immediateStrategy = new ImmediateExpenseStrategy();
      const gasto = await immediateStrategy.generate(gastoUnico, transaction);

      // Marcar como procesado
      await gastoUnico.update({ procesado: true }, { transaction });

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
   * IMPORTANT: This method is called AFTER findReadyForGeneration has already
   * determined that this expense should be generated. Therefore, we don't
   * re-check shouldGenerate here to avoid duplicate logic and ensure catch-up works.
   */
  static async generateFromGastoRecurrente(gastoRecurrente) {
    const transaction = await sequelize.transaction();
    try {
      const recurringStrategy = new RecurringExpenseStrategy();

      // NOTE: We skip shouldGenerate check because findReadyForGeneration
      // already filtered expenses. This ensures catch-up logic works correctly.

      // Use adjustedDate if provided by catch-up logic, otherwise use today
      const targetDate = gastoRecurrente.adjustedDate ||
                        moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

      // Generar el gasto usando la estrategia con la fecha correcta
      const gasto = await recurringStrategy.generateWithDate(gastoRecurrente, targetDate, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde gasto recurrente con estrategia:', {
        gasto_id: gasto.id,
        gastoRecurrente_id: gastoRecurrente.id,
        frecuencia: gastoRecurrente.frecuencia?.nombre_frecuencia,
        fecha_generada: targetDate,
        is_catchup: !!gastoRecurrente.adjustedDate
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
   * IMPORTANT: Like generateFromGastoRecurrente, this is called AFTER
   * findReadyForGeneration has filtered expenses, so we skip shouldGenerate.
   */
  static async generateFromDebitoAutomatico(debitoAutomatico) {
    const transaction = await sequelize.transaction();
    try {
      const automaticDebitStrategy = new AutomaticDebitExpenseStrategy();

      // NOTE: We skip shouldGenerate check because findReadyForGeneration
      // already filtered expenses. This ensures catch-up logic works correctly.

      // Generar el gasto usando la estrategia
      const gasto = await automaticDebitStrategy.generate(debitoAutomatico, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde débito automático con estrategia:', {
        gasto_id: gasto.id,
        debitoAutomatico_id: debitoAutomatico.id,
        frecuencia: debitoAutomatico.frecuencia?.nombre_frecuencia
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
   */
  static async generateFromCompra(compra) {
    const transaction = await sequelize.transaction();
    try {
      // Validar foreign keys requeridos
      const missingKeys = this.validateCompraForeignKeys(compra);
      if (missingKeys.length > 0) {
        await transaction.rollback();
        const error = new Error(`Missing required foreign keys: ${missingKeys.join(', ')}`);
        logger.error('Foreign key validation failed:', {
          compra_id: compra.id,
          missing_keys: missingKeys
        });
        throw error;
      }

      const installmentStrategy = new InstallmentExpenseStrategy();

      // Verificar si debe generar cuota hoy
      const shouldGenerate = await installmentStrategy.shouldGenerate(compra);
      if (!shouldGenerate) {
        await transaction.rollback();
        return null;
      }

      // Generar el gasto usando la estrategia
      const gasto = await installmentStrategy.generate(compra, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde compra con estrategia:', {
        gasto_id: gasto.id,
        compra_id: compra.id,
        monto: gasto.monto_ars
      });
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
   */
  static async generateScheduledExpenses(userId = null) {
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
      const compras = await this.comprasService.findReadyForGeneration(userId);
      results.summary.breakdown.compras.processed = compras.length;

      logger.debug('Processing installment purchases', {
        count: compras.length
      });

      await this.processExpensesBatch(
        compras,
        'compra',
        this.generateFromCompra,
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
   * Genera gastos con lógica MANUAL (sin restricción de tolerancia)
   * Genera todos los gastos del mes actual que aún no fueron generados
   * @param {number} userId - ID del usuario para filtrar gastos
   */
  static async generateManualExpenses(userId) {
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
      logger.info('Starting MANUAL expense generation process (no tolerance)', { userId });

      // Process recurring expenses with MANUAL method (no tolerance)
      const gastosRecurrentes = await this.gastoRecurrenteService.findReadyForManualGeneration(userId);
      results.summary.breakdown.recurrentes.processed = gastosRecurrentes.length;

      logger.debug('Processing recurring expenses (MANUAL)', {
        count: gastosRecurrentes.length,
        expenses: gastosRecurrentes.map(g => ({
          id: g.id,
          descripcion: g.descripcion,
          dia_de_pago: g.dia_de_pago,
          reason: g.generationReason
        }))
      });

      await this.processExpensesBatch(
        gastosRecurrentes,
        'recurrente',
        this.generateFromGastoRecurrente,
        results
      );

      // Process automatic debits with MANUAL method (no tolerance)
      const debitosAutomaticos = await this.debitoAutomaticoService.findReadyForManualGeneration(userId);
      results.summary.breakdown.debitos.processed = debitosAutomaticos.length;

      logger.debug('Processing automatic debits (MANUAL)', {
        count: debitosAutomaticos.length,
        debits: debitosAutomaticos.map(d => ({
          id: d.id,
          descripcion: d.descripcion,
          dia_de_pago: d.dia_de_pago,
          reason: d.generationReason
        }))
      });

      await this.processExpensesBatch(
        debitosAutomaticos,
        'debito',
        this.generateFromDebitoAutomatico,
        results
      );

      // Process installment purchases (same logic for manual)
      const compras = await this.comprasService.findReadyForGeneration(userId);
      results.summary.breakdown.compras.processed = compras.length;

      logger.debug('Processing installment purchases (MANUAL)', {
        count: compras.length
      });

      await this.processExpensesBatch(
        compras,
        'compra',
        this.generateFromCompra,
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

      logger.info('MANUAL expense generation completed successfully', {
        total_success: results.success.length,
        total_errors: results.errors.length,
        processing_time_ms: results.summary.processing_time_ms,
        breakdown: results.summary.breakdown
      });

      return results;
    } catch (error) {
      const endTime = Date.now();
      results.summary.processing_time_ms = endTime - startTime;

      logger.error('Fatal error in MANUAL expense generation', {
        error: error.message,
        stack: error.stack,
        processing_time_ms: results.summary.processing_time_ms
      });
      throw error;
    }
  }

  /**
   * Método para procesamiento MANUAL desde el botón "Procesar Pendientes"
   * Usa lógica sin restricción de tolerancia - genera todos los gastos del mes actual
   * que aún no fueron generados, incluyendo gastos únicos pendientes
   * @param {number} userId - ID del usuario para filtrar gastos (requerido para endpoint manual)
   */
  static async generatePendingExpenses(userId) {
    const results = {
      success: [],
      errors: []
    };

    try {
      // Generar gastos programados con lógica MANUAL (sin tolerancia)
      const scheduledResults = await this.generateManualExpenses(userId);
      results.success.push(...scheduledResults.success);
      results.errors.push(...scheduledResults.errors);

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
