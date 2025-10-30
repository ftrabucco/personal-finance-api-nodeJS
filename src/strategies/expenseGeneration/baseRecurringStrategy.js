import { BaseExpenseGenerationStrategy } from './baseStrategy.js';
import moment from 'moment-timezone';
import logger from '../../utils/logger.js';

/**
 * Base strategy for recurring expenses (gastos recurrentes and débitos automáticos)
 * Implements DRY principle by consolidating common recurring logic
 */
export class BaseRecurringStrategy extends BaseExpenseGenerationStrategy {

  /**
   * Common validation logic for recurring expenses
   * @param {Object} source - The recurring expense source object
   * @returns {Promise<boolean>} True if should generate expense today
   */
  async shouldGenerate(source) {
    if (!source.activo) {
      logger.debug(`${this.getType()} is not active`, {
        id: source.id,
        type: this.getType()
      });
      return false;
    }

    const today = moment().tz('America/Argentina/Buenos_Aires');
    const diaActual = today.date();
    const mesActual = today.month() + 1;

    // Check if it's the correct payment day
    if (diaActual !== source.dia_de_pago) {
      logger.debug(`Not the payment day for ${this.getType()}`, {
        id: source.id,
        diaActual,
        dia_de_pago: source.dia_de_pago,
        type: this.getType()
      });
      return false;
    }

    // For annual frequency, check if it's the correct month
    if (source.mes_de_pago && mesActual !== source.mes_de_pago) {
      logger.debug(`Not the payment month for annual ${this.getType()}`, {
        id: source.id,
        mesActual,
        mes_de_pago: source.mes_de_pago,
        type: this.getType()
      });
      return false;
    }

    // Check if already generated today
    if (source.ultima_fecha_generado) {
      const ultimaFecha = moment(source.ultima_fecha_generado);
      if (ultimaFecha.isSame(today, 'day')) {
        logger.debug(`${this.getType()} already generated today`, {
          id: source.id,
          ultima_fecha_generado: source.ultima_fecha_generado,
          type: this.getType()
        });
        return false;
      }
    }

    // Check date boundaries (optional for subclasses to override)
    return this.validateDateBoundaries(source, today);
  }

  /**
   * Validate date boundaries (start/end dates)
   * Subclasses can override this for specific validation
   * @param {Object} source - The recurring expense source object
   * @param {moment.Moment} today - Current date
   * @returns {boolean} True if within valid date range
   */
  validateDateBoundaries(source, today) {
    // Check start date if exists
    if (source.fecha_inicio) {
      const fechaInicio = moment(source.fecha_inicio);
      if (today.isBefore(fechaInicio, 'day')) {
        logger.debug(`${this.getType()} start date not reached`, {
          id: source.id,
          fecha_inicio: source.fecha_inicio,
          today: today.format('YYYY-MM-DD'),
          type: this.getType()
        });
        return false;
      }
    }

    // Check end date if exists
    if (source.fecha_fin) {
      const fechaFin = moment(source.fecha_fin);
      if (today.isAfter(fechaFin, 'day')) {
        logger.debug(`${this.getType()} end date passed`, {
          id: source.id,
          fecha_fin: source.fecha_fin,
          today: today.format('YYYY-MM-DD'),
          type: this.getType()
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Update the last generated date for the recurring source
   * @param {Object} source - The recurring expense source object
   * @param {string} fechaParaBD - Date string in YYYY-MM-DD format
   * @param {Object} transaction - Database transaction object
   */
  async updateLastGeneratedDate(source, fechaParaBD, transaction) {
    await source.update({
      ultima_fecha_generado: fechaParaBD
    }, { transaction });

    logger.debug(`Updated last generated date for ${this.getType()}`, {
      id: source.id,
      ultima_fecha_generado: fechaParaBD,
      type: this.getType()
    });
  }

  /**
   * Common validation for recurring expense sources
   * @param {Object} source - The recurring expense source object
   * @returns {boolean} True if source is valid
   */
  validateSource(source) {
    return super.validateSource(source) &&
           source.monto &&
           source.dia_de_pago &&
           source.frecuencia_gasto_id;
  }

  /**
   * Generate recurring expense with common pattern
   * Subclasses should call this method and provide specific data
   * @param {Object} source - The recurring expense source object
   * @param {Object} additionalData - Additional data specific to the strategy
   * @param {Object} transaction - Database transaction object
   * @returns {Promise<Object|null>} Generated expense or null
   */
  async generateRecurringExpense(source, additionalData, transaction) {
    if (!this.validateSource(source) || !await this.shouldGenerate(source)) {
      return null;
    }

    try {
      const today = moment().tz('America/Argentina/Buenos_Aires');
      const fechaParaBD = today.format('YYYY-MM-DD');

      // 💱 Use pre-calculated multi-currency amounts (updated daily by ExchangeRateScheduler)
      const gastoData = this.createGastoData(source, {
        fecha: fechaParaBD,
        monto_ars: source.monto_ars || source.monto, // Backward compatibility
        monto_usd: source.monto_usd || null,
        moneda_origen: source.moneda_origen || 'ARS',
        tipo_cambio_usado: source.tipo_cambio_referencia || null, // Para recurrentes usa tipo_cambio_referencia
        ...additionalData
      });

      const gasto = await this.Gasto.create(gastoData, {
        transaction,
        fields: Object.keys(gastoData)
      });

      // Update the last generated date
      await this.updateLastGeneratedDate(source, fechaParaBD, transaction);

      logger.info(`${this.getType()} expense generated successfully (multi-currency)`, {
        gasto_id: gasto.id,
        source_id: source.id,
        type: this.getType(),
        monto_ars: gasto.monto_ars,
        monto_usd: gasto.monto_usd,
        moneda_origen: source.moneda_origen
      });

      return gasto;
    } catch (error) {
      logger.error(`Error generating ${this.getType()} expense`, {
        error: error.message,
        source_id: source.id,
        type: this.getType()
      });
      throw error;
    }
  }
}
