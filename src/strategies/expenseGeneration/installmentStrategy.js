import { BaseExpenseGenerationStrategy } from './baseStrategy.js';
import { Gasto } from '../../models/index.js';
import { CreditCardDateService } from '../../services/creditCardDate.service.js';
import moment from 'moment-timezone';
import logger from '../../utils/logger.js';

/**
 * Estrategia para cuotas de compras - Generación programada
 *
 * REGLAS DE GENERACIÓN:
 *
 * Para 1 cuota:
 * - Efectivo/Débito/Transferencia/MercadoPago: Se genera inmediatamente (en fecha_compra o al correr scheduler)
 * - Tarjeta de Crédito: Se genera en dia_vencimiento de la tarjeta
 *   - Si compra antes del dia_cierre: vence este mes
 *   - Si compra después del dia_cierre: vence el mes siguiente
 *
 * Para múltiples cuotas:
 * - Efectivo/Débito/Transferencia/MercadoPago:
 *   - Primera cuota: Se genera inmediatamente (en fecha_compra o al correr scheduler)
 *   - Cuotas siguientes: Se generan el mismo día del mes de la compra
 * - Tarjeta de Crédito: Cada cuota en el dia_vencimiento de la tarjeta
 */
export class InstallmentExpenseStrategy extends BaseExpenseGenerationStrategy {
  async generate(compra, transaction = null) {
    // Only validate source structure, skip shouldGenerate check.
    // shouldGenerate is already called by findReadyForGeneration upstream.
    if (!this.validateSource(compra)) {
      return null;
    }

    try {
      const today = moment().tz('America/Argentina/Buenos_Aires');

      // Calcular cuál cuota corresponde
      const cuotaActual = await this.calculateCurrentInstallment(compra);

      // Calcular fecha: tarjeta de crédito usa fecha de vencimiento, otros usan hoy
      let fechaParaBD;
      const isCreditCard = compra.tarjeta_id && compra.tarjeta?.tipo === 'credito';
      if (isCreditCard) {
        const cuotaNumero0Based = cuotaActual - 1;
        const fechaVencimiento = CreditCardDateService.calculateDueDate(compra, compra.tarjeta, cuotaNumero0Based);
        fechaParaBD = fechaVencimiento.format('YYYY-MM-DD');
      } else {
        fechaParaBD = today.format('YYYY-MM-DD');
      }

      // 💱 Calculate installment amount in both currencies
      const { montoCuotaARS, montoCuotaUSD } = await this.calculateInstallmentAmountMultiCurrency(compra);

      const gastoData = this.createGastoData(compra, {
        fecha: fechaParaBD,
        monto_ars: montoCuotaARS,
        monto_usd: montoCuotaUSD,
        moneda_origen: compra.moneda_origen || 'ARS',
        tipo_cambio_usado: compra.tipo_cambio_usado || null,
        descripcion: `${compra.descripcion} - Cuota ${cuotaActual}/${compra.cantidad_cuotas || 1}`
      });

      const gasto = await Gasto.create(gastoData, {
        transaction,
        fields: Object.keys(gastoData)
      });

      // Actualizar estado de la compra
      await this.updateCompraStatus(compra, cuotaActual, transaction);

      logger.info('Gasto generado con estrategia cuotas (multi-moneda):', {
        gasto_id: gasto.id,
        compra_id: compra.id,
        cuota: `${cuotaActual}/${compra.cantidad_cuotas || 1}`,
        monto_ars: montoCuotaARS,
        monto_usd: montoCuotaUSD,
        moneda_origen: compra.moneda_origen
      });

      return gasto;
    } catch (error) {
      logger.error('Error en estrategia cuotas:', {
        error: error.message,
        compra_id: compra.id
      });
      throw error;
    }
  }

  /**
   * @param {Object} compra - La compra
   * @param {boolean} allowCatchUp - Si true, genera cuotas cuya fecha de vencimiento ya pasó (para generación manual)
   */
  async shouldGenerate(compra, allowCatchUp = false) {
    if (!compra.pendiente_cuotas) {
      return false;
    }

    const today = moment().tz('America/Argentina/Buenos_Aires');
    const cuotasGeneradas = await this.getGeneratedInstallmentsCount(compra);
    const totalCuotas = compra.cantidad_cuotas || 1;

    // Verificar que aún quedan cuotas por generar
    if (cuotasGeneradas >= totalCuotas) {
      return false;
    }

    // Para cuota única
    if (totalCuotas === 1) {
      return this.shouldGenerateSingleInstallment(compra, today, allowCatchUp);
    }

    // Para múltiples cuotas
    return this.shouldGenerateMultipleInstallment(compra, today, cuotasGeneradas, allowCatchUp);
  }

  /**
   * Verifica si debe generar una cuota única
   */
  shouldGenerateSingleInstallment(compra, today, allowCatchUp = false) {
    // Si ya se generó, no generar de nuevo
    if (compra.fecha_ultima_cuota_generada) {
      return false;
    }

    // Si es tarjeta de crédito, verificar día de vencimiento
    if (this.isCreditCardPayment(compra)) {
      return this.shouldGenerateOnCreditCardDueDate(compra, today, 0, allowCatchUp);
    }

    // Para otros medios de pago (efectivo, débito, transferencia)
    // Se genera inmediatamente (en la fecha de compra)
    const fechaCompra = moment(compra.fecha_compra);
    return today.isSameOrAfter(fechaCompra, 'day');
  }

  /**
   * Verifica si debe generar una cuota de múltiples cuotas
   *
   * REGLAS:
   * - Primera cuota (cuotasGeneradas === 0):
   *   - Efectivo/Débito/Transferencia: Generar inmediatamente (si hoy >= fecha_compra)
   *   - Tarjeta de Crédito: Generar en día de vencimiento de la tarjeta
   *
   * - Cuotas siguientes (cuotasGeneradas > 0):
   *   - Efectivo/Débito/Transferencia: Generar el mismo día del mes de la compra
   *   - Tarjeta de Crédito: Generar en día de vencimiento de la tarjeta
   */
  shouldGenerateMultipleInstallment(compra, today, cuotasGeneradas, allowCatchUp = false) {
    // Verificar que no se haya generado cuota este mes
    if (compra.fecha_ultima_cuota_generada) {
      const ultimaCuota = moment(compra.fecha_ultima_cuota_generada);
      if (ultimaCuota.isSame(today, 'month') && ultimaCuota.isSame(today, 'year')) {
        return false;
      }
    }

    // Si es tarjeta de crédito, siempre usar día de vencimiento
    if (this.isCreditCardPayment(compra)) {
      return this.shouldGenerateOnCreditCardDueDate(compra, today, cuotasGeneradas, allowCatchUp);
    }

    // Para otros medios de pago (efectivo, débito, transferencia):
    const fechaCompra = moment(compra.fecha_compra);

    if (cuotasGeneradas === 0) {
      // Primera cuota: generar inmediatamente (si hoy >= fecha_compra)
      return today.isSameOrAfter(fechaCompra, 'day');
    }

    // Cuotas siguientes: mismo día del mes que la fecha de compra
    // Con catch-up: también generar si ya pasó el día este mes
    if (allowCatchUp) {
      return today.date() >= fechaCompra.date();
    }
    return today.date() === fechaCompra.date();
  }

  /**
   * Verifica si el pago es con tarjeta de crédito
   */
  isCreditCardPayment(compra) {
    // Verificar si tiene tarjeta asociada y es tipo 'credito'
    return compra.tarjeta_id && compra.tarjeta?.tipo === 'credito';
  }

  /**
   * Verifica si debe generar en el día de vencimiento de la tarjeta de crédito
   * Utiliza el CreditCardDateService para cálculos inteligentes
   */
  /**
   * Verifica si debe generar en el día de vencimiento de la tarjeta de crédito
   * @param {Object} compra - La compra
   * @param {moment.Moment} today - Fecha actual
   * @param {number} cuotaNumero - Número de cuota (0-based)
   * @param {boolean} allowCatchUp - Si true, también genera si la fecha de vencimiento ya pasó
   */
  shouldGenerateOnCreditCardDueDate(compra, today, cuotaNumero = 0, allowCatchUp = false) {
    if (!compra.tarjeta || compra.tarjeta.tipo !== 'credito') {
      logger.error('Tarjeta de crédito inválida o no configurada:', {
        compra_id: compra.id,
        tarjeta_id: compra.tarjeta_id,
        tipo: compra.tarjeta?.tipo
      });
      return false;
    }

    try {
      // Validar configuración de la tarjeta
      const validacion = CreditCardDateService.validateCreditCardConfiguration(compra.tarjeta);
      if (!validacion.isValid) {
        logger.error('Configuración de tarjeta inválida:', {
          compra_id: compra.id,
          tarjeta_id: compra.tarjeta_id,
          errors: validacion.errors
        });
        return false;
      }

      // Verificar si hoy es día de vencimiento (o ya pasó, en modo catch-up)
      const shouldGenerate = allowCatchUp
        ? CreditCardDateService.isDueDateTodayOrPassed(compra, compra.tarjeta, cuotaNumero, today)
        : CreditCardDateService.isDueDateToday(compra, compra.tarjeta, cuotaNumero, today);

      if (shouldGenerate) {
        logger.info(`Día de vencimiento ${allowCatchUp ? '(catch-up) ' : ''}detectado para compra:`, {
          compra_id: compra.id,
          tarjeta_id: compra.tarjeta_id,
          cuotaNumero: cuotaNumero + 1,
          fecha_hoy: today.format('YYYY-MM-DD'),
          allowCatchUp
        });
      }

      return shouldGenerate;
    } catch (error) {
      logger.error('Error al verificar día de vencimiento:', {
        error: error.message,
        compra_id: compra.id,
        tarjeta_id: compra.tarjeta_id,
        cuotaNumero
      });
      return false;
    }
  }

  async calculateCurrentInstallment(compra) {
    const cuotasGeneradas = await this.getGeneratedInstallmentsCount(compra);
    return cuotasGeneradas + 1;
  }

  /**
   * 💱 Calculate installment amount in both currencies
   * Uses the pre-calculated monto_total_ars and monto_total_usd from the Compra
   * (which are updated daily by ExchangeRateScheduler)
   * @param {Object} compra - The compra object
   * @returns {Promise<{montoCuotaARS: number, montoCuotaUSD: number|null}>}
   */
  async calculateInstallmentAmountMultiCurrency(compra) {
    const cantidadCuotas = compra.cantidad_cuotas || 1;

    // Si es cuota única, devolver los montos totales
    if (cantidadCuotas === 1) {
      return {
        montoCuotaARS: compra.monto_total_ars || compra.monto_total, // Backward compatibility
        montoCuotaUSD: compra.monto_total_usd || null
      };
    }

    // Para múltiples cuotas, dividir ambos montos
    const montoCuotaARS = Math.round((compra.monto_total_ars || compra.monto_total) / cantidadCuotas * 100) / 100;
    const montoCuotaUSD = compra.monto_total_usd
      ? Math.round((compra.monto_total_usd / cantidadCuotas) * 100) / 100
      : null;

    return {
      montoCuotaARS,
      montoCuotaUSD
    };
  }

  /**
   * @deprecated Use calculateInstallmentAmountMultiCurrency instead
   * Kept for backward compatibility
   */
  async calculateInstallmentAmount(compra) {
    const { montoCuotaARS } = await this.calculateInstallmentAmountMultiCurrency(compra);
    return montoCuotaARS;
  }

  async getGeneratedInstallmentsCount(compra) {
    const gastosGenerados = await Gasto.count({
      where: {
        tipo_origen: 'compra',
        id_origen: compra.id
      }
    });
    return gastosGenerados;
  }

  async updateCompraStatus(compra, cuotaActual, transaction) {
    const today = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

    const updateData = {
      fecha_ultima_cuota_generada: today
    };

    // Si es la última cuota, marcar como completa
    if (cuotaActual >= (compra.cantidad_cuotas || 1)) {
      updateData.pendiente_cuotas = false;
    }

    await compra.update(updateData, { transaction });
  }

  /**
   * Genera gastos históricos para cuotas ya pagadas al crear una compra.
   * Reutiliza calculateInstallmentAmountMultiCurrency y createGastoData.
   */
  async generateHistoricalInstallments(compra, cuotasPagadas, transaction) {
    const isCreditCard = compra.tarjeta_id && compra.tarjeta?.tipo === 'credito';
    const cantidadCuotas = compra.cantidad_cuotas || 1;
    const { montoCuotaARS, montoCuotaUSD } = await this.calculateInstallmentAmountMultiCurrency(compra);

    const gastos = [];
    let lastDate = null;

    for (let i = 0; i < cuotasPagadas; i++) {
      let fechaMoment;

      if (isCreditCard) {
        fechaMoment = CreditCardDateService.calculateDueDate(compra, compra.tarjeta, i);
      } else {
        const fechaCompra = moment(compra.fecha_compra);
        fechaMoment = moment(compra.fecha_compra).add(i, 'months');
        fechaMoment.date(Math.min(fechaCompra.date(), fechaMoment.daysInMonth()));
      }

      const fecha = fechaMoment.format('YYYY-MM-DD');

      const gastoData = this.createGastoData(compra, {
        fecha,
        monto_ars: montoCuotaARS,
        monto_usd: montoCuotaUSD,
        moneda_origen: compra.moneda_origen || 'ARS',
        tipo_cambio_usado: compra.tipo_cambio_usado || null,
        descripcion: `${compra.descripcion} - Cuota ${i + 1}/${cantidadCuotas}`
      });

      const gasto = await Gasto.create(gastoData, { transaction });
      gastos.push(gasto);
      lastDate = fecha;
    }

    return { gastos, lastDate };
  }

  getType() {
    return 'compra';
  }

  validateSource(compra) {
    return super.validateSource(compra) &&
           compra.monto_total &&
           compra.fecha_compra;
  }
}
