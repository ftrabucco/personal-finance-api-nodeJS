import cron from 'node-cron';
import { GastoRecurrente, DebitoAutomatico, Compra } from '../models/index.js';
import ExchangeRateService from '../services/exchangeRate.service.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * 💱 Exchange Rate Scheduler - Actualización automática de tipos de cambio
 *
 * Funciones principales:
 * 1. Actualizar tipo de cambio desde API externa (diario)
 * 2. Recalcular montos USD/ARS de gastos recurrentes activos
 * 3. Recalcular montos USD/ARS de débitos automáticos activos
 * 4. Recalcular montos USD/ARS de cuotas pendientes de compras
 *
 * Cron schedule: 00:00 diario (antes de que corra ExpenseScheduler)
 */
export class ExchangeRateScheduler {
  static isRunning = false;
  static scheduledTask = null;
  static stats = {
    lastExecution: null,
    lastSuccess: null,
    lastError: null,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0
  };

  /**
   * Inicia el scheduler de actualización de tipo de cambio
   */
  static start() {
    if (!config.scheduler?.enabled) {
      logger.info('💱 Exchange Rate Scheduler deshabilitado en configuración');
      return;
    }

    if (this.isRunning) {
      logger.warn('⚠️ Exchange Rate Scheduler ya está ejecutándose');
      return;
    }

    try {
      const timezone = config.scheduler?.timezone || 'America/Argentina/Buenos_Aires';

      // Ejecutar a las 00:00 todos los días (antes del ExpenseScheduler a las 00:05)
      this.scheduledTask = cron.schedule('0 0 * * *', async () => {
        await this.executeDailyUpdate();
      }, { scheduled: false, timezone });

      this.scheduledTask.start();
      this.isRunning = true;

      logger.info('🚀 Exchange Rate Scheduler iniciado exitosamente', {
        schedule: '0 0 * * * (00:00 diario)',
        timezone,
        nextExecution: this.getNextExecutionTime()
      });

      // Nota: La inicialización del tipo de cambio se hace en el bootstrap
      // (src/bootstrap/exchangeRate.bootstrap.js), no aquí.
      // El scheduler solo se encarga de las actualizaciones diarias programadas.

    } catch (error) {
      logger.error('❌ Error al iniciar Exchange Rate Scheduler:', { error: error.message });
      throw error;
    }
  }

  /**
   * Detiene el scheduler
   */
  static stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.isRunning = false;
      logger.info('🛑 Exchange Rate Scheduler detenido');
    }
  }

  /**
   * Ejecuta la actualización diaria completa
   */
  static async executeDailyUpdate() {
    const startTime = Date.now();
    this.stats.lastExecution = new Date();
    this.stats.totalExecutions++;

    logger.info('💱 ========================================');
    logger.info('💱 INICIANDO ACTUALIZACIÓN DIARIA DE TIPO DE CAMBIO');
    logger.info('💱 ========================================');

    try {
      // 1. Actualizar tipo de cambio desde API
      await this.updateExchangeRateFromAPI();

      // 2. Recalcular montos de gastos recurrentes
      const recurrentesUpdated = await this.updateRecurringExpensesCurrency();

      // 3. Recalcular montos de débitos automáticos
      const debitosUpdated = await this.updateAutomaticDebitsCurrency();

      // 4. Recalcular montos de cuotas pendientes
      const cuotasUpdated = await this.updatePendingInstallmentsCurrency();

      const executionTime = Date.now() - startTime;
      this.stats.lastSuccess = new Date();
      this.stats.successfulExecutions++;

      logger.info('✅ ACTUALIZACIÓN DIARIA COMPLETADA EXITOSAMENTE', {
        executionTime: `${executionTime}ms`,
        recurrentesUpdated,
        debitosUpdated,
        cuotasUpdated,
        totalUpdated: recurrentesUpdated + debitosUpdated + cuotasUpdated
      });

      logger.info('💱 ========================================');

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.stats.lastError = {
        date: new Date(),
        error: error.message,
        stack: error.stack
      };
      this.stats.failedExecutions++;

      logger.error('❌ ERROR EN ACTUALIZACIÓN DIARIA DE TIPO DE CAMBIO', {
        error: error.message,
        stack: error.stack,
        executionTime: `${executionTime}ms`
      });

      logger.info('💱 ========================================');
    }
  }

  /**
   * Paso 1: Actualizar tipo de cambio desde API externa
   * Usa el método centralizado del servicio
   */
  static async updateExchangeRateFromAPI() {
    logger.info('📡 Actualizando tipo de cambio desde API externa...');

    try {
      // Usar método centralizado del servicio
      const tipoCambio = await ExchangeRateService.fetchAndSaveFromExternalAPI();

      if (!tipoCambio) {
        // Si fallan las APIs, intentar usar el último conocido
        logger.warn('⚠️ No se pudo actualizar TC desde APIs, usando último conocido');
        return await ExchangeRateService.getCurrentRate();
      }

      return tipoCambio;
    } catch (error) {
      logger.error('❌ Error al actualizar TC desde API', { error: error.message });
      throw error;
    }
  }

  /**
   * Paso 2: Recalcular montos de gastos recurrentes activos
   */
  static async updateRecurringExpensesCurrency() {
    logger.info('🔄 Recalculando montos de gastos recurrentes...');

    try {
      const tcActual = await ExchangeRateService.getCurrentRate();

      const recurrentes = await GastoRecurrente.findAll({
        where: { activo: true }
      });

      let updatedCount = 0;

      for (const gasto of recurrentes) {
        try {
          // Calcular ambas monedas basándose en moneda origen
          const { monto_ars, monto_usd } = await ExchangeRateService
            .calculateBothCurrencies(gasto.monto, gasto.moneda_origen, tcActual);

          await gasto.update({
            monto_ars,
            monto_usd,
            tipo_cambio_referencia: tcActual.valor_venta_usd_ars
          });

          updatedCount++;
        } catch (error) {
          logger.error('Error al actualizar gasto recurrente', {
            gastoId: gasto.id,
            error: error.message
          });
        }
      }

      logger.info('✅ Gastos recurrentes actualizados', {
        total: recurrentes.length,
        updated: updatedCount,
        tc: tcActual.valor_venta_usd_ars
      });

      return updatedCount;
    } catch (error) {
      logger.error('❌ Error al actualizar gastos recurrentes', { error: error.message });
      throw error;
    }
  }

  /**
   * Paso 3: Recalcular montos de débitos automáticos activos
   */
  static async updateAutomaticDebitsCurrency() {
    logger.info('🔄 Recalculando montos de débitos automáticos...');

    try {
      const tcActual = await ExchangeRateService.getCurrentRate();

      const debitos = await DebitoAutomatico.findAll({
        where: { activo: true }
      });

      let updatedCount = 0;

      for (const debito of debitos) {
        try {
          // Calcular ambas monedas basándose en moneda origen
          const { monto_ars, monto_usd } = await ExchangeRateService
            .calculateBothCurrencies(debito.monto, debito.moneda_origen, tcActual);

          await debito.update({
            monto_ars,
            monto_usd,
            tipo_cambio_referencia: tcActual.valor_venta_usd_ars
          });

          updatedCount++;
        } catch (error) {
          logger.error('Error al actualizar débito automático', {
            debitoId: debito.id,
            error: error.message
          });
        }
      }

      logger.info('✅ Débitos automáticos actualizados', {
        total: debitos.length,
        updated: updatedCount,
        tc: tcActual.valor_venta_usd_ars
      });

      return updatedCount;
    } catch (error) {
      logger.error('❌ Error al actualizar débitos automáticos', { error: error.message });
      throw error;
    }
  }

  /**
   * Paso 4: Recalcular montos USD/ARS de cuotas pendientes de compras
   *
   * Importante: Las compras tienen monto_total fijo, pero cada CUOTA generada
   * debe reflejar el TC del día en que se genera.
   *
   * Aquí actualizamos el monto_total_ars/usd de las COMPRAS activas
   * para que las proyecciones sean realistas.
   */
  static async updatePendingInstallmentsCurrency() {
    logger.info('🔄 Recalculando montos de compras con cuotas pendientes...');

    try {
      const tcActual = await ExchangeRateService.getCurrentRate();

      // Solo compras con cuotas pendientes
      const compras = await Compra.findAll({
        where: { pendiente_cuotas: true }
      });

      let updatedCount = 0;

      for (const compra of compras) {
        try {
          // Calcular ambas monedas basándose en moneda origen
          const { monto_ars, monto_usd } = await ExchangeRateService
            .calculateBothCurrencies(compra.monto_total, compra.moneda_origen, tcActual);

          await compra.update({
            monto_total_ars: monto_ars,
            monto_total_usd: monto_usd,
            tipo_cambio_usado: tcActual.valor_venta_usd_ars
          });

          updatedCount++;
        } catch (error) {
          logger.error('Error al actualizar compra', {
            compraId: compra.id,
            error: error.message
          });
        }
      }

      logger.info('✅ Compras con cuotas pendientes actualizadas', {
        total: compras.length,
        updated: updatedCount,
        tc: tcActual.valor_venta_usd_ars
      });

      return updatedCount;
    } catch (error) {
      logger.error('❌ Error al actualizar compras', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtiene la próxima fecha de ejecución
   */
  static getNextExecutionTime() {
    if (!this.scheduledTask) return null;

    // Calcular próxima medianoche
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return tomorrow.toISOString();
  }

  /**
   * Obtiene estadísticas del scheduler
   */
  static getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      nextExecution: this.getNextExecutionTime()
    };
  }

  /**
   * Ejecuta actualización manual (para testing o updates on-demand)
   */
  static async executeManualUpdate() {
    logger.info('🔧 Ejecutando actualización manual de tipo de cambio...');
    await this.executeDailyUpdate();
  }
}

export default ExchangeRateScheduler;
