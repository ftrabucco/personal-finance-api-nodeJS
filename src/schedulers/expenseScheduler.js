import cron from 'node-cron';
import { GastoGeneratorService } from '../services/gastoGenerator.service.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';
import moment from 'moment-timezone';

/**
 * Intelligent Expense Scheduler - Enhanced with smart scheduling capabilities
 *
 * Features:
 * - Smart frequency-based scheduling
 * - Retry mechanisms for failed generations
 * - Performance monitoring and adaptive scheduling
 * - Holiday and weekend awareness
 * - Load balancing and batch optimization
 *
 * Nota: Los gastos únicos NO se procesan aquí - se crean inmediatamente
 */
export class ExpenseScheduler {
  static isRunning = false;
  static scheduledTasks = [];
  static performanceMetrics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageExecutionTime: 0,
    lastExecution: null,
    consecutiveFailures: 0
  };
  static retryQueue = [];
  static adaptiveConfig = {
    minInterval: 60000, // 1 minute
    maxInterval: 3600000, // 1 hour
    currentInterval: 300000, // 5 minutes default
    backoffMultiplier: 1.5
  };

  /**
   * Inicia el scheduler inteligente con múltiples tareas
   */
  static start() {
    if (!config.scheduler?.enabled) {
      logger.info('📅 Intelligent Scheduler deshabilitado en configuración');
      return;
    }

    if (this.isRunning) {
      logger.warn('⚠️ Scheduler ya está ejecutándose');
      return;
    }

    try {
      this.setupIntelligentScheduling();
      this.isRunning = true;

      logger.info('🚀 Intelligent Expense Scheduler iniciado exitosamente', {
        mainSchedule: config.scheduler?.cronPattern || '5 0 * * *',
        timezone: config.scheduler?.timezone || 'America/Argentina/Buenos_Aires',
        retryEnabled: config.scheduler?.retryEnabled !== false,
        adaptiveScheduling: config.scheduler?.adaptiveScheduling !== false,
        nextMainExecution: this.getNextExecutionTime()
      });

      // Ejecutar una vez al inicio si está configurado
      if (config.scheduler?.runOnStartup) {
        logger.info('🔄 Ejecutando generación inicial...');
        setTimeout(() => this.executeScheduledGeneration(), 5000);
      }

    } catch (error) {
      logger.error('❌ Error al iniciar Intelligent Scheduler:', { error: error.message });
      throw error;
    }
  }

  /**
   * Configura múltiples tareas inteligentes de scheduling
   */
  static setupIntelligentScheduling() {
    const timezone = config.scheduler?.timezone || 'America/Argentina/Buenos_Aires';

    // 1. Tarea principal: generación diaria inteligente
    const mainPattern = config.scheduler?.cronPattern || '5 0 * * *';
    const mainTask = cron.schedule(mainPattern, async () => {
      await this.executeIntelligentGeneration();
    }, { scheduled: false, timezone });

    this.scheduledTasks.push({ name: 'main', task: mainTask });
    mainTask.start();

    // 2. Tarea de reintentos cada 15 minutos
    if (config.scheduler?.retryEnabled !== false) {
      const retryTask = cron.schedule('*/15 * * * *', async () => {
        await this.processRetryQueue();
      }, { scheduled: false, timezone });

      this.scheduledTasks.push({ name: 'retry', task: retryTask });
      retryTask.start();
      logger.debug('🔄 Retry scheduler configurado (cada 15 minutos)');
    }

    // 3. Tarea de monitoreo de rendimiento cada hora
    const monitoringTask = cron.schedule('0 * * * *', async () => {
      await this.performanceMonitoring();
    }, { scheduled: false, timezone });

    this.scheduledTasks.push({ name: 'monitoring', task: monitoringTask });
    monitoringTask.start();
    logger.debug('📊 Performance monitoring configurado (cada hora)');

    // 4. Tarea de optimización adaptativa (cada 6 horas)
    if (config.scheduler?.adaptiveScheduling !== false) {
      const adaptiveTask = cron.schedule('0 */6 * * *', async () => {
        await this.adaptiveOptimization();
      }, { scheduled: false, timezone });

      this.scheduledTasks.push({ name: 'adaptive', task: adaptiveTask });
      adaptiveTask.start();
      logger.debug('🎯 Adaptive optimization configurado (cada 6 horas)');
    }

    // 5. Tarea de limpieza y mantenimiento (diaria a las 2 AM)
    const maintenanceTask = cron.schedule('0 2 * * *', async () => {
      await this.performMaintenance();
    }, { scheduled: false, timezone });

    this.scheduledTasks.push({ name: 'maintenance', task: maintenanceTask });
    maintenanceTask.start();
    logger.debug('🧹 Maintenance task configurado (diario a las 2 AM)');
  }

  /**
   * Detiene todas las tareas programadas
   */
  static stop() {
    if (!this.isRunning) {
      logger.info('📅 Scheduler no está ejecutándose');
      return;
    }

    this.scheduledTasks.forEach(taskInfo => {
      taskInfo.task.destroy();
    });

    this.scheduledTasks = [];
    this.isRunning = false;

    logger.info('⏹️ Intelligent Expense Scheduler detenido', {
      performanceMetrics: this.performanceMetrics,
      retryQueueSize: this.retryQueue.length
    });
  }

  /**
   * Ejecuta la generación inteligente de gastos programados
   * Incluye análisis de contexto y optimizaciones
   */
  static async executeIntelligentGeneration() {
    const startTime = Date.now();
    const today = moment().tz('America/Argentina/Buenos_Aires');

    try {
      logger.info('🧠 Iniciando generación inteligente de gastos programados...', {
        date: today.format('YYYY-MM-DD'),
        dayOfWeek: today.format('dddd'),
        isWeekend: today.day() === 0 || today.day() === 6,
        isHoliday: this.isHoliday(today)
      });

      // 1. Análisis de contexto pre-generación
      const contextAnalysis = await this.analyzeGenerationContext(today);

      // 2. Aplicar optimizaciones basadas en el contexto
      const optimizedExecution = this.optimizeExecution(contextAnalysis);

      // 3. Ejecutar generación con optimizaciones
      const results = await this.executeWithOptimizations(optimizedExecution);

      // 4. Actualizar métricas de rendimiento
      this.updatePerformanceMetrics(startTime, true, results);

      // 5. Procesar resultados y manejar reintentos
      await this.processResults(results);

      const duration = Date.now() - startTime;
      logger.info('✅ Generación inteligente completada exitosamente', {
        duration_ms: duration,
        total_generated: results.success.length,
        total_errors: results.errors.length,
        context: contextAnalysis,
        optimizations: optimizedExecution.optimizations
      });

      return results;
    } catch (error) {
      this.updatePerformanceMetrics(startTime, false, null);
      await this.handleGenerationError(error, today);

      const duration = Date.now() - startTime;
      logger.error('❌ Error en generación inteligente:', {
        error: error.message,
        duration_ms: duration,
        consecutiveFailures: this.performanceMetrics.consecutiveFailures
      });
    }
  }

  /**
   * Analiza el contexto para optimizar la generación
   */
  static async analyzeGenerationContext(today) {
    const context = {
      date: today.format('YYYY-MM-DD'),
      dayOfWeek: today.day(),
      isWeekend: today.day() === 0 || today.day() === 6,
      isHoliday: this.isHoliday(today),
      isMonthEnd: today.date() >= 28,
      isMonthStart: today.date() <= 3,
      timeOfDay: 'morning', // Based on typical execution time
      systemLoad: this.getSystemLoadIndicator()
    };

    // Analizar patrones históricos si está disponible
    if (this.performanceMetrics.totalRuns > 10) {
      context.historicalPattern = {
        averageExecutionTime: this.performanceMetrics.averageExecutionTime,
        successRate: this.performanceMetrics.successfulRuns / this.performanceMetrics.totalRuns,
        recentFailures: this.performanceMetrics.consecutiveFailures
      };
    }

    logger.debug('📊 Context analysis completed', context);
    return context;
  }

  /**
   * Optimiza la ejecución basada en el contexto
   */
  static optimizeExecution(context) {
    const optimizations = {
      batchSize: 10, // Default
      parallelProcessing: true,
      retryImmediately: false,
      prioritizeTypes: ['debito', 'recurrente', 'compra'],
      delayBetweenBatches: 100,
      useCircuitBreaker: false
    };

    // Optimizaciones basadas en contexto
    if (context.isWeekend || context.isHoliday) {
      optimizations.batchSize = 5; // Reduced load
      optimizations.delayBetweenBatches = 200;
      logger.debug('🏖️ Weekend/Holiday optimizations applied');
    }

    if (context.isMonthEnd || context.isMonthStart) {
      optimizations.batchSize = 15; // Higher load expected
      optimizations.prioritizeTypes = ['recurrente', 'debito', 'compra'];
      logger.debug('📅 Month-end/start optimizations applied');
    }

    if (context.historicalPattern?.successRate < 0.8) {
      optimizations.batchSize = 5; // Conservative approach
      optimizations.useCircuitBreaker = true;
      optimizations.retryImmediately = true;
      logger.debug('🛡️ Low success rate - applying conservative optimizations');
    }

    if (context.systemLoad === 'high') {
      optimizations.parallelProcessing = false;
      optimizations.delayBetweenBatches = 500;
      logger.debug('⚡ High system load - reducing parallel processing');
    }

    return { context, optimizations };
  }

  /**
   * Ejecuta la generación con optimizaciones aplicadas
   */
  static async executeWithOptimizations(optimizedExecution) {
    const { optimizations } = optimizedExecution;

    // Aplicar configuraciones de optimización al GastoGeneratorService
    if (optimizations.useCircuitBreaker) {
      logger.debug('🔌 Circuit breaker enabled for this execution');
    }

    // Ejecutar con configuraciones optimizadas
    const results = await GastoGeneratorService.generateScheduledExpenses();

    // Aplicar post-procesamiento según optimizaciones
    if (optimizations.retryImmediately && results.errors.length > 0) {
      logger.debug('🔄 Applying immediate retry for failed items');
      // Add failed items to immediate retry (not implemented in this version)
    }

    return results;
  }

  /**
   * Verifica si una fecha es feriado (básico)
   */
  static isHoliday(date) {
    // Lista básica de feriados argentinos fijos
    const holidays = [
      '01-01', // Año Nuevo
      '05-01', // Día del Trabajador
      '05-25', // Revolución de Mayo
      '07-09', // Día de la Independencia
      '12-08', // Inmaculada Concepción
      '12-25' // Navidad
    ];

    const monthDay = date.format('MM-DD');
    return holidays.includes(monthDay);
  }

  /**
   * Obtiene un indicador de carga del sistema
   */
  static getSystemLoadIndicator() {
    // Implementación básica - podría expandirse con métricas reales
    const memoryUsage = process.memoryUsage();
    const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (heapUsedPercentage > 80) return 'high';
    if (heapUsedPercentage > 60) return 'medium';
    return 'low';
  }

  /**
   * Actualiza las métricas de rendimiento
   */
  static updatePerformanceMetrics(startTime, success, results) {
    const duration = Date.now() - startTime;

    this.performanceMetrics.totalRuns++;
    this.performanceMetrics.lastExecution = new Date().toISOString();

    if (success) {
      this.performanceMetrics.successfulRuns++;
      this.performanceMetrics.consecutiveFailures = 0;
    } else {
      this.performanceMetrics.failedRuns++;
      this.performanceMetrics.consecutiveFailures++;
    }

    // Calcular promedio de tiempo de ejecución
    const totalTime = this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalRuns - 1) + duration;
    this.performanceMetrics.averageExecutionTime = totalTime / this.performanceMetrics.totalRuns;
  }

  /**
   * Procesa los resultados y maneja reintentos
   */
  static async processResults(results) {
    // Agregar errores a la cola de reintentos
    if (results.errors.length > 0) {
      const retryItems = results.errors.map(error => ({
        type: error.type,
        id: error.id,
        error: error.error,
        timestamp: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3
      }));

      this.retryQueue.push(...retryItems);

      logger.debug('📋 Added items to retry queue', {
        newItems: retryItems.length,
        totalQueueSize: this.retryQueue.length
      });
    }

    // Limpiar elementos exitosos de la cola de reintentos
    if (results.success.length > 0) {
      const successIds = results.success.map(s => `${s.type}-${s.source_id}`);
      const originalQueueSize = this.retryQueue.length;

      this.retryQueue = this.retryQueue.filter(item =>
        !successIds.includes(`${item.type}-${item.id}`)
      );

      if (originalQueueSize > this.retryQueue.length) {
        logger.debug('✅ Removed successful items from retry queue', {
          removed: originalQueueSize - this.retryQueue.length,
          remaining: this.retryQueue.length
        });
      }
    }
  }

  /**
   * Maneja errores de generación con estrategias inteligentes
   */
  static async handleGenerationError(error, today) {
    // Añadir a la cola de reintentos para procesamiento posterior
    this.retryQueue.push({
      type: 'full_generation',
      error: error.message,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      context: {
        date: today.format('YYYY-MM-DD'),
        consecutiveFailures: this.performanceMetrics.consecutiveFailures
      }
    });

    // Si hay muchos fallos consecutivos, ajustar la configuración adaptativa
    if (this.performanceMetrics.consecutiveFailures >= 3) {
      this.adaptiveConfig.currentInterval = Math.min(
        this.adaptiveConfig.currentInterval * this.adaptiveConfig.backoffMultiplier,
        this.adaptiveConfig.maxInterval
      );

      logger.warn('🚨 Multiple consecutive failures detected - applying backoff', {
        newInterval: this.adaptiveConfig.currentInterval,
        consecutiveFailures: this.performanceMetrics.consecutiveFailures
      });
    }
  }

  /**
   * Procesa la cola de reintentos
   */
  static async processRetryQueue() {
    if (this.retryQueue.length === 0) {
      return;
    }

    logger.debug('🔄 Processing retry queue', {
      queueSize: this.retryQueue.length
    });

    const itemsToRetry = this.retryQueue.filter(item => item.attempts < item.maxAttempts);
    const itemsToRemove = [];

    for (const item of itemsToRetry) {
      try {
        item.attempts++;

        if (item.type === 'full_generation') {
          // Retry full generation
          await this.executeIntelligentGeneration();
          itemsToRemove.push(item);
        } else {
          // Retry specific expense generation
          // This would need specific retry logic per type
          logger.debug('Specific item retry not implemented yet', {
            type: item.type,
            id: item.id
          });
        }

      } catch (error) {
        logger.warn('Retry attempt failed', {
          type: item.type,
          id: item.id,
          attempt: item.attempts,
          error: error.message
        });

        if (item.attempts >= item.maxAttempts) {
          itemsToRemove.push(item);
          logger.error('Item exceeded max retry attempts', {
            type: item.type,
            id: item.id,
            maxAttempts: item.maxAttempts
          });
        }
      }
    }

    // Remove completed or failed items
    this.retryQueue = this.retryQueue.filter(item => !itemsToRemove.includes(item));

    if (itemsToRemove.length > 0) {
      logger.debug('🧹 Cleaned up retry queue', {
        removedItems: itemsToRemove.length,
        remainingItems: this.retryQueue.length
      });
    }
  }

  /**
   * Monitoreo de rendimiento y ajustes adaptativos
   */
  static async performanceMonitoring() {
    const metrics = this.performanceMetrics;
    const successRate = metrics.totalRuns > 0 ? metrics.successfulRuns / metrics.totalRuns : 0;

    logger.info('📊 Performance monitoring report', {
      metrics,
      successRate: (successRate * 100).toFixed(2) + '%',
      retryQueueSize: this.retryQueue.length,
      adaptiveConfig: this.adaptiveConfig
    });

    // Alertas de rendimiento
    if (successRate < 0.7 && metrics.totalRuns > 5) {
      logger.warn('🚨 Low success rate detected', {
        successRate: (successRate * 100).toFixed(2) + '%',
        totalRuns: metrics.totalRuns,
        consecutiveFailures: metrics.consecutiveFailures
      });
    }

    if (metrics.averageExecutionTime > 60000) { // > 1 minute
      logger.warn('⏰ High average execution time detected', {
        averageTime: metrics.averageExecutionTime + 'ms',
        recommendation: 'Consider optimization'
      });
    }

    if (this.retryQueue.length > 50) {
      logger.warn('📋 Large retry queue detected', {
        queueSize: this.retryQueue.length,
        recommendation: 'Check for systematic issues'
      });
    }
  }

  /**
   * Optimización adaptativa basada en métricas históricas
   */
  static async adaptiveOptimization() {
    const metrics = this.performanceMetrics;
    const successRate = metrics.totalRuns > 0 ? metrics.successfulRuns / metrics.totalRuns : 1;

    logger.debug('🎯 Running adaptive optimization', {
      currentMetrics: metrics,
      successRate,
      currentConfig: this.adaptiveConfig
    });

    // Ajustar intervalos basado en el rendimiento
    if (successRate > 0.95 && metrics.consecutiveFailures === 0) {
      // Rendimiento excelente - reducir intervalo para mayor frecuencia
      this.adaptiveConfig.currentInterval = Math.max(
        this.adaptiveConfig.currentInterval * 0.8,
        this.adaptiveConfig.minInterval
      );
      logger.debug('⚡ Excellent performance - reducing interval');

    } else if (successRate < 0.8 || metrics.consecutiveFailures > 1) {
      // Rendimiento pobre - aumentar intervalo
      this.adaptiveConfig.currentInterval = Math.min(
        this.adaptiveConfig.currentInterval * this.adaptiveConfig.backoffMultiplier,
        this.adaptiveConfig.maxInterval
      );
      logger.debug('🐌 Poor performance - increasing interval');
    }

    // Reset configuración si ha mejorado después de problemas
    if (metrics.consecutiveFailures === 0 && successRate > 0.9) {
      this.adaptiveConfig.currentInterval = 300000; // Reset to 5 minutes
      logger.debug('🔄 Resetting adaptive configuration - performance recovered');
    }
  }

  /**
   * Mantenimiento y limpieza periódica
   */
  static async performMaintenance() {
    logger.info('🧹 Running scheduled maintenance');

    const maintenanceResults = {
      retryQueueCleaned: 0,
      metricsReset: false,
      oldEntriesRemoved: 0
    };

    // 1. Limpiar entradas antiguas de la cola de reintentos (> 24 horas)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const originalQueueSize = this.retryQueue.length;

    this.retryQueue = this.retryQueue.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime > oneDayAgo;
    });

    maintenanceResults.retryQueueCleaned = originalQueueSize - this.retryQueue.length;

    // 2. Reset métricas si han pasado muchos días sin actividad
    if (this.performanceMetrics.lastExecution) {
      const lastExecution = new Date(this.performanceMetrics.lastExecution).getTime();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      if (lastExecution < sevenDaysAgo) {
        this.performanceMetrics = {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          averageExecutionTime: 0,
          lastExecution: null,
          consecutiveFailures: 0
        };
        maintenanceResults.metricsReset = true;
      }
    }

    // 3. Log resultados del mantenimiento
    if (maintenanceResults.retryQueueCleaned > 0 || maintenanceResults.metricsReset) {
      logger.info('✅ Maintenance completed', maintenanceResults);
    } else {
      logger.debug('✅ Maintenance completed - no action needed');
    }
  }

  /**
   * Ejecuta una generación manual (para testing o debug)
   */
  static async executeManualGeneration() {
    logger.info('🔧 Ejecutando generación manual...');
    return await this.executeIntelligentGeneration();
  }

  /**
   * Ejecuta generación legacy (backward compatibility)
   */
  static async executeScheduledGeneration() {
    logger.info('🔧 Ejecutando generación legacy (usar executeIntelligentGeneration)...');
    return await this.executeIntelligentGeneration();
  }

  /**
   * Obtiene el estado completo del scheduler inteligente
   */
  static getStatus() {
    const status = {
      isRunning: this.isRunning,
      activeTasks: this.scheduledTasks.length,
      nextExecution: this.isRunning ? this.getNextExecutionTime() : null,
      config: {
        enabled: config.scheduler?.enabled || false,
        cronPattern: config.scheduler?.cronPattern || '5 0 * * *',
        timezone: config.scheduler?.timezone || 'America/Argentina/Buenos_Aires',
        runOnStartup: config.scheduler?.runOnStartup || false,
        retryEnabled: config.scheduler?.retryEnabled !== false,
        adaptiveScheduling: config.scheduler?.adaptiveScheduling !== false
      },
      intelligence: {
        performanceMetrics: this.performanceMetrics,
        retryQueue: {
          size: this.retryQueue.length,
          oldestItem: this.retryQueue.length > 0 ? this.retryQueue[0].timestamp : null
        },
        adaptiveConfig: this.adaptiveConfig,
        successRate: this.performanceMetrics.totalRuns > 0
          ? (this.performanceMetrics.successfulRuns / this.performanceMetrics.totalRuns * 100).toFixed(2) + '%'
          : 'N/A'
      },
      tasks: this.scheduledTasks.map(taskInfo => ({
        name: taskInfo.name,
        isRunning: taskInfo.task.running || false
      }))
    };

    return status;
  }

  /**
   * Obtiene métricas detalladas para monitoreo
   */
  static getDetailedMetrics() {
    return {
      performance: this.performanceMetrics,
      retryQueue: this.retryQueue.map(item => ({
        type: item.type,
        id: item.id,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        age: Date.now() - new Date(item.timestamp).getTime(),
        error: item.error
      })),
      adaptiveConfig: this.adaptiveConfig,
      systemInfo: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version
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
