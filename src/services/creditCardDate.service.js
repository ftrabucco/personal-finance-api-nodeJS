import moment from 'moment-timezone';
import logger from '../utils/logger.js';

/**
 * Servicio para manejo inteligente de fechas de tarjetas de crédito
 * Proporciona lógica avanzada para cálculo de fechas de cierre y vencimiento
 */
export class CreditCardDateService {
  /**
   * Zona horaria para Argentina
   */
  static TIMEZONE = 'America/Argentina/Buenos_Aires';

  /**
   * Calcula la fecha de vencimiento inteligente para una compra con tarjeta de crédito
   * @param {Object} compra - La compra
   * @param {Object} tarjeta - La tarjeta de crédito
   * @param {number} cuotaNumero - Número de cuota (0 para primera cuota)
   * @param {moment.Moment} fechaReferencia - Fecha de referencia (opcional, default: hoy)
   * @returns {moment.Moment} Fecha de vencimiento calculada
   */
  static calculateDueDate(compra, tarjeta, cuotaNumero = 0, fechaReferencia = null) {
    if (!tarjeta || tarjeta.tipo !== 'credito') {
      throw new Error('Solo se pueden calcular fechas para tarjetas de crédito');
    }

    if (!tarjeta.dia_mes_cierre || !tarjeta.dia_mes_vencimiento) {
      throw new Error('La tarjeta de crédito debe tener configurados los días de cierre y vencimiento');
    }

    const fechaCompra = moment(compra.fecha).tz(this.TIMEZONE);
    const referencia = fechaReferencia ? moment(fechaReferencia).tz(this.TIMEZONE) : moment().tz(this.TIMEZONE);

    // Para la primera cuota, calcular basado en el ciclo de la tarjeta
    if (cuotaNumero === 0) {
      return this.calculateFirstInstallmentDueDate(fechaCompra, tarjeta);
    }

    // Para cuotas siguientes, calcular basado en la fecha de la primera cuota
    return this.calculateSubsequentInstallmentDueDate(fechaCompra, tarjeta, cuotaNumero, referencia);
  }

  /**
   * Calcula la fecha de vencimiento para la primera cuota
   * @param {moment.Moment} fechaCompra - Fecha de compra
   * @param {Object} tarjeta - Tarjeta de crédito
   * @returns {moment.Moment} Fecha de vencimiento
   */
  static calculateFirstInstallmentDueDate(fechaCompra, tarjeta) {
    const diaCierre = tarjeta.dia_mes_cierre;
    const diaVencimiento = tarjeta.dia_mes_vencimiento;

    // Normalizar las fechas al inicio del día
    const fechaCompraNorm = moment(fechaCompra).startOf('day');
    const fechaCierre = this.getClosingDateForMonth(fechaCompraNorm, diaCierre);

    logger.debug('Calculando fecha de vencimiento para primera cuota:', {
      fechaCompra: fechaCompraNorm.format('YYYY-MM-DD'),
      fechaCierre: fechaCierre.format('YYYY-MM-DD'),
      diaCierre,
      diaVencimiento
    });

    // Si la compra fue antes o en el día de cierre, vence en el ciclo actual
    if (fechaCompraNorm.isSameOrBefore(fechaCierre, 'day')) {
      const fechaVencimiento = this.getDueDateForClosingCycle(fechaCierre, diaVencimiento);
      logger.debug('Compra antes del cierre - vence en ciclo actual:', {
        fechaVencimiento: fechaVencimiento.format('YYYY-MM-DD')
      });
      return fechaVencimiento;
    }

    // Si la compra fue después del cierre, vence en el siguiente ciclo
    const siguienteCierre = this.getNextClosingDate(fechaCierre, diaCierre);
    const fechaVencimiento = this.getDueDateForClosingCycle(siguienteCierre, diaVencimiento);

    logger.debug('Compra después del cierre - vence en siguiente ciclo:', {
      siguienteCierre: siguienteCierre.format('YYYY-MM-DD'),
      fechaVencimiento: fechaVencimiento.format('YYYY-MM-DD')
    });

    return fechaVencimiento;
  }

  /**
   * Calcula la fecha de vencimiento para cuotas siguientes
   * @param {moment.Moment} fechaCompra - Fecha de compra original
   * @param {Object} tarjeta - Tarjeta de crédito
   * @param {number} cuotaNumero - Número de cuota
   * @param {moment.Moment} fechaReferencia - Fecha de referencia
   * @returns {moment.Moment} Fecha de vencimiento
   */
  static calculateSubsequentInstallmentDueDate(fechaCompra, tarjeta, cuotaNumero, fechaReferencia) {
    const diaVencimiento = tarjeta.dia_mes_vencimiento;

    // Calcular la fecha de vencimiento de la primera cuota
    const primeraFechaVencimiento = this.calculateFirstInstallmentDueDate(fechaCompra, tarjeta);

    // Agregar los meses correspondientes a la cuota
    const fechaVencimiento = moment(primeraFechaVencimiento)
      .add(cuotaNumero, 'months')
      .date(diaVencimiento);

    // Manejar casos edge como 31 de febrero
    fechaVencimiento.date(Math.min(diaVencimiento, fechaVencimiento.daysInMonth()));

    logger.debug('Calculando fecha para cuota siguiente:', {
      cuotaNumero,
      primeraFecha: primeraFechaVencimiento.format('YYYY-MM-DD'),
      fechaCalculada: fechaVencimiento.format('YYYY-MM-DD')
    });

    return fechaVencimiento;
  }

  /**
   * Obtiene la fecha de cierre para un mes específico
   * @param {moment.Moment} fechaBase - Fecha base
   * @param {number} diaCierre - Día de cierre
   * @returns {moment.Moment} Fecha de cierre
   */
  static getClosingDateForMonth(fechaBase, diaCierre) {
    const fechaCierre = moment(fechaBase).date(diaCierre);

    // Manejar casos donde el día de cierre no existe en el mes (ej: 31 de febrero)
    if (fechaCierre.date() !== diaCierre) {
      // Si el día no existe, usar el último día del mes
      fechaCierre.endOf('month');
    }

    return fechaCierre;
  }

  /**
   * Obtiene la siguiente fecha de cierre
   * @param {moment.Moment} fechaCierreActual - Fecha de cierre actual
   * @param {number} diaCierre - Día de cierre
   * @returns {moment.Moment} Siguiente fecha de cierre
   */
  static getNextClosingDate(fechaCierreActual, diaCierre) {
    const siguienteMes = moment(fechaCierreActual).add(1, 'month');
    return this.getClosingDateForMonth(siguienteMes, diaCierre);
  }

  /**
   * Calcula la fecha de vencimiento para un ciclo específico de cierre
   * @param {moment.Moment} fechaCierre - Fecha de cierre
   * @param {number} diaVencimiento - Día de vencimiento
   * @returns {moment.Moment} Fecha de vencimiento
   */
  static getDueDateForClosingCycle(fechaCierre, diaVencimiento) {
    const mesVencimiento = moment(fechaCierre).add(1, 'month');
    const fechaVencimiento = mesVencimiento.date(diaVencimiento);

    // Manejar casos edge como 31 de febrero
    if (fechaVencimiento.date() !== diaVencimiento) {
      fechaVencimiento.endOf('month');
    }

    return fechaVencimiento;
  }

  /**
   * Verifica si hoy es día de vencimiento para una compra específica
   * @param {Object} compra - La compra
   * @param {Object} tarjeta - La tarjeta de crédito
   * @param {number} cuotaNumero - Número de cuota
   * @param {moment.Moment} fechaHoy - Fecha actual (opcional)
   * @returns {boolean} True si hoy es día de vencimiento
   */
  static isDueDateToday(compra, tarjeta, cuotaNumero = 0, fechaHoy = null) {
    try {
      const hoy = fechaHoy ? moment(fechaHoy).tz(this.TIMEZONE) : moment().tz(this.TIMEZONE);
      const fechaVencimiento = this.calculateDueDate(compra, tarjeta, cuotaNumero, hoy);

      const esHoy = hoy.isSame(fechaVencimiento, 'day');

      logger.debug('Verificando si es día de vencimiento:', {
        compra_id: compra.id,
        cuotaNumero,
        fechaHoy: hoy.format('YYYY-MM-DD'),
        fechaVencimiento: fechaVencimiento.format('YYYY-MM-DD'),
        esHoy
      });

      return esHoy;
    } catch (error) {
      logger.error('Error al verificar día de vencimiento:', {
        error: error.message,
        compra_id: compra.id,
        cuotaNumero
      });
      return false;
    }
  }

  /**
   * Calcula el próximo día de vencimiento para todas las cuotas pendientes
   * @param {Object} compra - La compra
   * @param {Object} tarjeta - La tarjeta de crédito
   * @param {number} cuotasGeneradas - Número de cuotas ya generadas
   * @returns {Array} Lista de fechas de vencimiento futuras
   */
  static getUpcomingDueDates(compra, tarjeta, cuotasGeneradas = 0) {
    const fechas = [];
    const totalCuotas = compra.cantidad_cuotas || 1;

    for (let i = cuotasGeneradas; i < totalCuotas; i++) {
      try {
        const fechaVencimiento = this.calculateDueDate(compra, tarjeta, i);
        fechas.push({
          cuota: i + 1,
          fecha: fechaVencimiento.format('YYYY-MM-DD'),
          moment: fechaVencimiento
        });
      } catch (error) {
        logger.error('Error calculando fecha futura:', {
          error: error.message,
          compra_id: compra.id,
          cuota: i + 1
        });
        break;
      }
    }

    return fechas;
  }

  /**
   * Valida la configuración de fechas de una tarjeta de crédito
   * @param {Object} tarjeta - La tarjeta de crédito
   * @returns {Object} Resultado de validación
   */
  static validateCreditCardConfiguration(tarjeta) {
    const errors = [];
    const warnings = [];

    if (!tarjeta.dia_mes_cierre) {
      errors.push('Día de cierre no configurado');
    } else if (tarjeta.dia_mes_cierre < 1 || tarjeta.dia_mes_cierre > 31) {
      errors.push('Día de cierre debe estar entre 1 y 31');
    }

    if (!tarjeta.dia_mes_vencimiento) {
      errors.push('Día de vencimiento no configurado');
    } else if (tarjeta.dia_mes_vencimiento < 1 || tarjeta.dia_mes_vencimiento > 31) {
      errors.push('Día de vencimiento debe estar entre 1 y 31');
    }

    // Verificar lógica temporal
    if (tarjeta.dia_mes_cierre && tarjeta.dia_mes_vencimiento) {
      // El vencimiento debería ser después del cierre (en el mes siguiente)
      if (tarjeta.dia_mes_vencimiento <= tarjeta.dia_mes_cierre) {
        warnings.push('Configuración poco común: día de vencimiento antes o igual al día de cierre');
      }

      // Verificar días que pueden no existir en todos los meses
      if (tarjeta.dia_mes_cierre > 28) {
        warnings.push('Día de cierre > 28 puede causar inconsistencias en febrero');
      }
      if (tarjeta.dia_mes_vencimiento > 28) {
        warnings.push('Día de vencimiento > 28 puede causar inconsistencias en febrero');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Obtiene información del ciclo actual de una tarjeta
   * @param {Object} tarjeta - La tarjeta de crédito
   * @param {moment.Moment} fechaReferencia - Fecha de referencia
   * @returns {Object} Información del ciclo
   */
  static getCurrentCycleInfo(tarjeta, fechaReferencia = null) {
    const hoy = fechaReferencia ? moment(fechaReferencia).tz(this.TIMEZONE) : moment().tz(this.TIMEZONE);
    const diaCierre = tarjeta.dia_mes_cierre;
    const diaVencimiento = tarjeta.dia_mes_vencimiento;

    const cierreEsteMe = this.getClosingDateForMonth(hoy, diaCierre);
    const vencimientoEsteMes = this.getDueDateForClosingCycle(
      cierreEsteMe.clone().subtract(1, 'month'),
      diaVencimiento
    );

    let cicloActual, proximoCierre, proximoVencimiento;

    if (hoy.isAfter(cierreEsteMe, 'day')) {
      // Estamos después del cierre de este mes
      cicloActual = 'post-cierre';
      proximoCierre = this.getNextClosingDate(cierreEsteMe, diaCierre);
      proximoVencimiento = this.getDueDateForClosingCycle(cierreEsteMe, diaVencimiento);
    } else {
      // Estamos antes o en el día de cierre
      cicloActual = 'pre-cierre';
      proximoCierre = cierreEsteMe;
      proximoVencimiento = vencimientoEsteMes;
    }

    return {
      cicloActual,
      proximoCierre: proximoCierre.format('YYYY-MM-DD'),
      proximoVencimiento: proximoVencimiento.format('YYYY-MM-DD'),
      diasHastaCierre: proximoCierre.diff(hoy, 'days'),
      diasHastaVencimiento: proximoVencimiento.diff(hoy, 'days')
    };
  }
}