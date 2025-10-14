import { BaseRecurringStrategy } from './baseRecurringStrategy.js';
import { Gasto } from '../../models/index.js';
import moment from 'moment-timezone';
import logger from '../../utils/logger.js';

/**
 * Enhanced strategy for automatic debits - Intelligent generation
 * Uses advanced frequency logic and smart date handling
 *
 * Key improvements:
 * - Better tolerance for missed payments
 * - Advanced frequency handling (daily, weekly, biweekly, etc.)
 * - Comprehensive logging and debugging
 * - End date validation specific to automatic debits
 */
export class AutomaticDebitExpenseStrategy extends BaseRecurringStrategy {
  constructor() {
    super();
    this.Gasto = Gasto;
  }

  async generate(debitoAutomatico, transaction = null) {
    if (!this.validateSource(debitoAutomatico)) {
      logger.error('Invalid automatic debit source', {
        debitoAutomatico_id: debitoAutomatico.id
      });
      return null;
    }

    try {
      const today = moment().tz('America/Argentina/Buenos_Aires');
      const fechaParaBD = today.format('YYYY-MM-DD');

      const gastoData = this.createGastoData(debitoAutomatico, {
        fecha: fechaParaBD,
        monto_ars: debitoAutomatico.monto,
        descripcion: debitoAutomatico.descripcion,
        frecuencia_gasto_id: debitoAutomatico.frecuencia_gasto_id
      });

      const gasto = await Gasto.create(gastoData, {
        transaction,
        fields: Object.keys(gastoData)
      });

      // Update last generation date
      await this.updateSourceLastGenerated(debitoAutomatico, fechaParaBD, transaction);

      logger.info('Automatic debit expense generated successfully', {
        gasto_id: gasto.id,
        debitoAutomatico_id: debitoAutomatico.id,
        monto: gasto.monto_ars,
        frecuencia: debitoAutomatico.frecuencia?.nombre,
        generation_reason: debitoAutomatico.generationReason
      });

      return gasto;
    } catch (error) {
      logger.error('Error generating automatic debit expense', {
        error: error.message,
        debitoAutomatico_id: debitoAutomatico.id,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update the automatic debit's last generation date
   * @param {Object} debitoAutomatico - The automatic debit source
   * @param {string} fecha - The generation date
   * @param {Transaction} transaction - Database transaction
   */
  async updateSourceLastGenerated(debitoAutomatico, fecha, transaction) {
    try {
      await debitoAutomatico.update(
        { ultima_fecha_generado: fecha },
        { transaction }
      );

      logger.debug('Updated automatic debit last generation date', {
        debitoAutomatico_id: debitoAutomatico.id,
        fecha
      });
    } catch (error) {
      logger.error('Error updating automatic debit last generation date', {
        error: error.message,
        debitoAutomatico_id: debitoAutomatico.id
      });
      // Don't throw here, as the main expense was created successfully
    }
  }

  /**
   * Enhanced shouldGenerate method that uses the improved service logic
   * @param {Object} debitoAutomatico - The automatic debit source
   * @returns {boolean} True if should generate today
   */
  async shouldGenerate(debitoAutomatico) {
    const today = moment().tz('America/Argentina/Buenos_Aires');

    logger.debug('Checking if automatic debit should generate', {
      debitoAutomatico_id: debitoAutomatico.id,
      descripcion: debitoAutomatico.descripcion,
      fecha_hoy: today.format('YYYY-MM-DD')
    });

    // Basic validation
    if (!this.validateSource(debitoAutomatico)) {
      return false;
    }

    // Check if already generated today
    if (debitoAutomatico.ultima_fecha_generado) {
      const ultimaFecha = moment(debitoAutomatico.ultima_fecha_generado).tz('America/Argentina/Buenos_Aires');
      if (ultimaFecha.isSame(today, 'day')) {
        logger.debug('Automatic debit already generated today', {
          debitoAutomatico_id: debitoAutomatico.id,
          ultima_fecha: ultimaFecha.format('YYYY-MM-DD')
        });
        return false;
      }
    }

    // Enhanced date boundary validation including fecha_fin
    if (!this.validateDateBoundaries(debitoAutomatico, today)) {
      logger.debug('Automatic debit outside valid date boundaries', {
        debitoAutomatico_id: debitoAutomatico.id,
        fecha_inicio: debitoAutomatico.fecha_inicio,
        fecha_fin: debitoAutomatico.fecha_fin
      });
      return false;
    }

    // If we have frequency information, validate it
    if (debitoAutomatico.frecuencia) {
      const frequencyValid = await this.validateFrequency(debitoAutomatico, today);
      if (!frequencyValid) {
        logger.debug('Automatic debit frequency validation failed', {
          debitoAutomatico_id: debitoAutomatico.id,
          frecuencia: debitoAutomatico.frecuencia.nombre
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Validate frequency for automatic debit using intelligent logic
   * @param {Object} debitoAutomatico - The automatic debit
   * @param {moment.Moment} today - Current date
   * @returns {boolean} True if frequency matches
   */
  async validateFrequency(debitoAutomatico, today) {
    // Use basic day comparison for backwards compatibility
    // The enhanced frequency logic is handled in the service layer
    const diaConfigurido = debitoAutomatico.dia_de_pago;
    const mesConfigurado = debitoAutomatico.mes_de_pago;

    // For annual frequency, check month
    if (debitoAutomatico.frecuencia.nombre.toLowerCase() === 'anual' && mesConfigurado) {
      if (today.month() + 1 !== mesConfigurado) {
        return false;
      }
    }

    // For other frequencies, check day with some tolerance
    if (diaConfigurido) {
      const todayDay = today.date();
      const targetDay = Math.min(diaConfigurido, today.daysInMonth());

      // Allow some tolerance for weekends and month-end issues
      const tolerance = this.calculateTolerance(debitoAutomatico.frecuencia.nombre, today);
      const diff = Math.abs(todayDay - targetDay);

      return diff <= tolerance;
    }

    return true;
  }

  /**
   * Calculate tolerance for date matching based on frequency and day
   * @param {string} frecuenciaNombre - Frequency name
   * @param {moment.Moment} today - Current date
   * @returns {number} Days of tolerance
   */
  calculateTolerance(frecuenciaNombre, today) {
    const isWeekend = today.day() === 0 || today.day() === 6;
    const baseWeekendTolerance = isWeekend ? 2 : 1;

    switch (frecuenciaNombre.toLowerCase()) {
    case 'diaria':
      return 0;
    case 'semanal':
      return baseWeekendTolerance;
    case 'quincenal':
    case 'mensual':
      return Math.max(baseWeekendTolerance, 2);
    case 'bimestral':
    case 'trimestral':
      return Math.max(baseWeekendTolerance, 3);
    case 'semestral':
    case 'anual':
      return Math.max(baseWeekendTolerance, 5);
    default:
      return baseWeekendTolerance;
    }
  }

  /**
   * Enhanced date boundary validation including end date
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
      const fechaFin = moment(source.fecha_fin).tz('America/Argentina/Buenos_Aires');
      if (today.isAfter(fechaFin, 'day')) {
        logger.debug('Automatic debit past end date', {
          debitoAutomatico_id: source.id,
          fecha_fin: fechaFin.format('YYYY-MM-DD'),
          fecha_hoy: today.format('YYYY-MM-DD')
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Validate automatic debit source data
   * @param {Object} source - The automatic debit source
   * @returns {boolean} True if valid
   */
  validateSource(source) {
    if (!super.validateSource(source)) {
      return false;
    }

    // Additional validations specific to automatic debits
    if (!source.monto || source.monto <= 0) {
      logger.error('Invalid automatic debit amount', {
        debitoAutomatico_id: source.id,
        monto: source.monto
      });
      return false;
    }

    if (!source.activo) {
      logger.debug('Automatic debit is inactive', {
        debitoAutomatico_id: source.id
      });
      return false;
    }

    return true;
  }

  getType() {
    return 'debito_automatico';
  }
}
