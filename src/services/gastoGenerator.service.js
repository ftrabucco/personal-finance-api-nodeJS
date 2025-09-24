import { Op } from 'sequelize';
import moment from 'moment-timezone';
import { Compra, GastoUnico, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../models/index.js';
import { ImmediateExpenseStrategy } from '../strategies/expenseGeneration/immediateStrategy.js';
import { RecurringExpenseStrategy } from '../strategies/expenseGeneration/recurringStrategy.js';
import { AutomaticDebitExpenseStrategy } from '../strategies/expenseGeneration/automaticDebitStrategy.js';
import { InstallmentExpenseStrategy } from '../strategies/expenseGeneration/installmentStrategy.js';
import { GastoRecurrenteService } from './gastoRecurrente.service.js';
import { DebitoAutomaticoService } from './debitoAutomatico.service.js';
import { ComprasService } from './compras.service.js';
import sequelize from '../db/postgres.js';
import logger from '../utils/logger.js';

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
   */
  static async generateFromGastoRecurrente(gastoRecurrente) {
    const transaction = await sequelize.transaction();
    try {
      const recurringStrategy = new RecurringExpenseStrategy();

      // Verificar si debe generar hoy
      const shouldGenerate = await recurringStrategy.shouldGenerate(gastoRecurrente);
      if (!shouldGenerate) {
        await transaction.rollback();
        return null;
      }

      // Generar el gasto usando la estrategia
      const gasto = await recurringStrategy.generate(gastoRecurrente, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde gasto recurrente con estrategia:', {
        gasto_id: gasto.id,
        gastoRecurrente_id: gastoRecurrente.id,
        frecuencia: gastoRecurrente.frecuencia?.nombre
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
   */
  static async generateFromDebitoAutomatico(debitoAutomatico) {
    const transaction = await sequelize.transaction();
    try {
      const automaticDebitStrategy = new AutomaticDebitExpenseStrategy();

      // Verificar si debe generar hoy
      const shouldGenerate = await automaticDebitStrategy.shouldGenerate(debitoAutomatico);
      if (!shouldGenerate) {
        await transaction.rollback();
        return null;
      }

      // Generar el gasto usando la estrategia
      const gasto = await automaticDebitStrategy.generate(debitoAutomatico, transaction);

      await transaction.commit();
      logger.info('Gasto generado desde débito automático con estrategia:', {
        gasto_id: gasto.id,
        debitoAutomatico_id: debitoAutomatico.id,
        frecuencia: debitoAutomatico.frecuencia?.nombre
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
   * Usado por el scheduler automático
   */
  static async generateScheduledExpenses() {
    const results = {
      success: [],
      errors: []
    };

    try {
      // Procesar gastos recurrentes activos usando el service migrado
      const gastosRecurrentes = await this.gastoRecurrenteService.findReadyForGeneration();

      for (const gastoRecurrente of gastosRecurrentes) {
        try {
          const gasto = await this.generateFromGastoRecurrente(gastoRecurrente);
          if (gasto) {
            results.success.push({
              type: 'recurrente',
              id: gasto.id,
              source_id: gastoRecurrente.id
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'recurrente',
            id: gastoRecurrente.id,
            error: error.message
          });
        }
      }

      // Procesar débitos automáticos activos usando el service migrado
      const debitosAutomaticos = await this.debitoAutomaticoService.findReadyForGeneration();

      for (const debitoAutomatico of debitosAutomaticos) {
        try {
          const gasto = await this.generateFromDebitoAutomatico(debitoAutomatico);
          if (gasto) {
            results.success.push({
              type: 'debito',
              id: gasto.id,
              source_id: debitoAutomatico.id
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'debito',
            id: debitoAutomatico.id,
            error: error.message
          });
        }
      }

      // Procesar compras con cuotas pendientes usando el service migrado
      const compras = await this.comprasService.findReadyForGeneration();

      for (const compra of compras) {
        try {
          const gasto = await this.generateFromCompra(compra);
          if (gasto) {
            results.success.push({
              type: 'compra',
              id: gasto.id,
              source_id: compra.id
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'compra',
            id: compra.id,
            error: error.message
          });
        }
      }

      logger.info('Generación automática de gastos programados completada', {
        total_success: results.success.length,
        total_errors: results.errors.length,
        types_processed: ['recurrente', 'debito', 'compra']
      });
      return results;
    } catch (error) {
      logger.error('Error en la generación automática de gastos programados:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Método legacy para compatibilidad con endpoint manual
   * Incluye gastos únicos para procesamiento manual
   */
  static async generatePendingExpenses() {
    const results = {
      success: [],
      errors: []
    };

    try {
      // Generar gastos programados (recurrentes, débitos, compras)
      const scheduledResults = await this.generateScheduledExpenses();
      results.success.push(...scheduledResults.success);
      results.errors.push(...scheduledResults.errors);

      // Procesar gastos únicos pendientes (para endpoint manual únicamente)
      const gastosUnicos = await GastoUnico.findAll({
        where: { procesado: false },
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