import cron from 'node-cron';
import { GastoGeneratorService } from '../services/gastoGenerator.service.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Scheduler para generar gastos recurrentes, débitos automáticos y cuotas
 *
 * Nota: Los gastos únicos NO se procesan aquí - se crean inmediatamente
 * al ser insertados en la tabla gastos_unico
 */
export class ExpenseScheduler {
  static isRunning = false;
  static scheduledTasks = [];

  /**
   * Inicia el scheduler si está habilitado en la configuración
   */
  static start() {
    if (!config.scheduler?.enabled) {
      logger.info('📅 Scheduler deshabilitado en configuración');
      return;
    }

    if (this.isRunning) {
      logger.warn('⚠️ Scheduler ya está ejecutándose');
      return;
    }

    const cronPattern = config.scheduler?.cronPattern || '5 0 * * *'; // Default: 00:05 AM diario

    try {
      // Tarea principal: generar gastos programados diariamente
      const mainTask = cron.schedule(cronPattern, async () => {
        await this.executeScheduledGeneration();
      }, {
        scheduled: false,
        timezone: config.scheduler?.timezone || 'America/Argentina/Buenos_Aires'
      });

      this.scheduledTasks.push(mainTask);
      mainTask.start();

      this.isRunning = true;

      logger.info('🚀 Expense Scheduler iniciado exitosamente', {
        cronPattern,
        timezone: config.scheduler?.timezone || 'America/Argentina/Buenos_Aires',
        nextExecution: this.getNextExecutionTime(cronPattern)
      });

      // Opcional: ejecutar una vez al inicio si está configurado
      if (config.scheduler?.runOnStartup) {
        logger.info('🔄 Ejecutando generación inicial...');
        setTimeout(() => this.executeScheduledGeneration(), 5000);
      }

    } catch (error) {
      logger.error('❌ Error al iniciar Expense Scheduler:', { error: error.message });
      throw error;
    }
  }

  /**
   * Detiene todas las tareas programadas
   */
  static stop() {
    if (!this.isRunning) {
      logger.info('📅 Scheduler no está ejecutándose');
      return;
    }

    this.scheduledTasks.forEach(task => {
      task.destroy();
    });

    this.scheduledTasks = [];
    this.isRunning = false;

    logger.info('⏹️ Expense Scheduler detenido');
  }

  /**
   * Ejecuta la generación de gastos programados
   * Solo procesa: gastos recurrentes, débitos automáticos y cuotas
   */
  static async executeScheduledGeneration() {
    const startTime = Date.now();

    try {
      logger.info('🔄 Iniciando generación automática de gastos programados...');

      // Usar el método específico para gastos programados (sin gastos únicos)
      const results = await GastoGeneratorService.generateScheduledExpenses();

      const duration = Date.now() - startTime;
      const summary = {
        total_generated: results.success.length,
        total_errors: results.errors.length,
        duration_ms: duration,
        breakdown: {
          recurrentes: results.success.filter(r => r.type === 'recurrente').length,
          debitos: results.success.filter(r => r.type === 'debito').length,
          compras: results.success.filter(r => r.type === 'compra').length
        },
        timestamp: new Date().toISOString()
      };

      if (results.errors.length > 0) {
        logger.warn('⚠️ Generación completada con errores:', {
          summary,
          errors: results.errors
        });
      } else {
        logger.info('✅ Generación automática completada exitosamente:', summary);
      }

      // Emitir evento para posibles extensiones futuras
      this.emitGenerationComplete(summary, results);

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error en generación automática de gastos:', {
        error: error.message,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });

      // En caso de error, no relanzar para no afectar el cron
      // El siguiente ciclo intentará nuevamente
    }
  }

  /**
   * Ejecuta una generación manual (para testing o debug)
   */
  static async executeManualGeneration() {
    logger.info('🔧 Ejecutando generación manual...');
    return await this.executeScheduledGeneration();
  }

  /**
   * Obtiene el estado actual del scheduler
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.scheduledTasks.length,
      nextExecution: this.isRunning ? this.getNextExecutionTime() : null,
      config: {
        enabled: config.scheduler?.enabled || false,
        cronPattern: config.scheduler?.cronPattern || '5 0 * * *',
        timezone: config.scheduler?.timezone || 'America/Argentina/Buenos_Aires',
        runOnStartup: config.scheduler?.runOnStartup || false
      }
    };
  }

  /**
   * Obtiene la próxima fecha de ejecución
   */
  static getNextExecutionTime(cronPattern = null) {
    try {
      const pattern = cronPattern || config.scheduler?.cronPattern || '5 0 * * *';
      const task = cron.schedule(pattern, () => {}, { scheduled: false });
      return task.nextDates().toString();
    } catch (error) {
      return 'No disponible';
    }
  }

  /**
   * Event emitter para extensiones futuras (Pub/Sub pattern)
   */
  static emitGenerationComplete(summary, results) {
    // Placeholder para futuras implementaciones event-driven
    // Aquí se podría integrar con sistemas como Redis Pub/Sub, EventEmitter, etc.

    // Por ahora solo loggea para debugging
    logger.debug('📢 Generation complete event emitted', { summary });
  }

  /**
   * Valida la configuración del scheduler
   */
  static validateConfig() {
    const errors = [];

    if (config.scheduler?.enabled) {
      if (config.scheduler?.cronPattern && !cron.validate(config.scheduler.cronPattern)) {
        errors.push('Patrón cron inválido');
      }
    }

    return errors;
  }
}

export default ExpenseScheduler;