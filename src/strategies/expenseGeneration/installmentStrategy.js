import { BaseExpenseGenerationStrategy } from './baseStrategy.js';
import { Gasto } from '../../models/index.js';
import moment from 'moment-timezone';
import logger from '../../utils/logger.js';

/**
 * Estrategia para cuotas de compras - Generación programada
 *
 * REGLAS DE GENERACIÓN:
 *
 * Para 1 cuota:
 * - Efectivo/Débito/Transferencia: Se genera en fecha_compra
 * - Tarjeta de Crédito: Se genera en dia_vencimiento de la tarjeta
 *   - Si compra antes del dia_cierre: vence este mes
 *   - Si compra después del dia_cierre: vence el mes siguiente
 *
 * Para múltiples cuotas:
 * - Efectivo/Débito/Transferencia: Cada cuota el mismo día del mes de la compra
 * - Tarjeta de Crédito: Cada cuota en el dia_vencimiento de la tarjeta
 */
export class InstallmentExpenseStrategy extends BaseExpenseGenerationStrategy {
  async generate(compra, transaction = null) {
    if (!this.validateSource(compra) || !await this.shouldGenerate(compra)) {
      return null;
    }

    try {
      const today = moment().tz('America/Argentina/Buenos_Aires');
      const fechaParaBD = today.format('YYYY-MM-DD');

      // Calcular cuál cuota corresponde
      const cuotaActual = await this.calculateCurrentInstallment(compra);
      const montoCuota = await this.calculateInstallmentAmount(compra);

      const gastoData = this.createGastoData(compra, {
        fecha: fechaParaBD,
        monto_ars: montoCuota,
        descripcion: `${compra.descripcion} - Cuota ${cuotaActual}/${compra.cantidad_cuotas || 1}`
      });

      const gasto = await Gasto.create(gastoData, {
        transaction,
        fields: Object.keys(gastoData)
      });

      // Actualizar estado de la compra
      await this.updateCompraStatus(compra, cuotaActual, transaction);

      logger.info('Gasto generado con estrategia cuotas:', {
        gasto_id: gasto.id,
        compra_id: compra.id,
        cuota: `${cuotaActual}/${compra.cantidad_cuotas || 1}`,
        monto: montoCuota
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

  async shouldGenerate(compra) {
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
      return this.shouldGenerateSingleInstallment(compra, today);
    }

    // Para múltiples cuotas
    return this.shouldGenerateMultipleInstallment(compra, today, cuotasGeneradas);
  }

  /**
   * Verifica si debe generar una cuota única
   */
  shouldGenerateSingleInstallment(compra, today) {
    // Si ya se generó, no generar de nuevo
    if (compra.fecha_ultima_cuota_generada) {
      return false;
    }

    // Si es tarjeta de crédito, verificar día de vencimiento
    if (this.isCreditCardPayment(compra)) {
      return this.shouldGenerateOnCreditCardDueDate(compra, today);
    }

    // Para otros medios de pago (efectivo, débito, transferencia)
    // Se genera inmediatamente (en la fecha de compra)
    const fechaCompra = moment(compra.fecha);
    return today.isSameOrAfter(fechaCompra, 'day');
  }

  /**
   * Verifica si debe generar una cuota de múltiples cuotas
   */
  shouldGenerateMultipleInstallment(compra, today, cuotasGeneradas) {
    // Verificar que no se haya generado cuota este mes
    if (compra.fecha_ultima_cuota_generada) {
      const ultimaCuota = moment(compra.fecha_ultima_cuota_generada);
      if (ultimaCuota.isSame(today, 'month') && ultimaCuota.isSame(today, 'year')) {
        return false;
      }
    }

    // Si es tarjeta de crédito, usar día de vencimiento de la tarjeta
    if (this.isCreditCardPayment(compra)) {
      return this.shouldGenerateOnCreditCardDueDate(compra, today, cuotasGeneradas);
    }

    // Para otros medios de pago, usar el mismo día del mes de la compra
    const fechaCompra = moment(compra.fecha);
    const diaCompra = fechaCompra.date();
    const diaHoy = today.date();

    return diaHoy === diaCompra;
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
   */
  shouldGenerateOnCreditCardDueDate(compra, today, cuotaNumero = 0) {
    if (!compra.tarjeta || !compra.tarjeta.dia_vencimiento) {
      logger.error('Tarjeta de crédito sin día de vencimiento configurado:', {
        compra_id: compra.id,
        tarjeta_id: compra.tarjeta_id
      });
      return false;
    }

    const diaVencimiento = compra.tarjeta.dia_vencimiento;
    const diaHoy = today.date();

    // Para la primera cuota, calcular el mes de vencimiento según día de cierre
    if (cuotaNumero === 0) {
      const fechaCompra = moment(compra.fecha);
      const diaCompra = fechaCompra.date();
      const diaCierre = compra.tarjeta.dia_mes_cierre || 28; // Default si no está configurado

      let mesVencimiento = fechaCompra.month();
      let anioVencimiento = fechaCompra.year();

      // Si la compra fue después del día de cierre, vence el mes siguiente
      if (diaCompra > diaCierre) {
        if (mesVencimiento === 11) { // Diciembre
          mesVencimiento = 0; // Enero del año siguiente
          anioVencimiento++;
        } else {
          mesVencimiento++;
        }
      }

      // Verificar si hoy es el día de vencimiento del mes correspondiente
      return today.date() === diaVencimiento &&
             today.month() === mesVencimiento &&
             today.year() === anioVencimiento;
    }

    // Para cuotas siguientes, simplemente verificar el día de vencimiento
    return diaHoy === diaVencimiento;
  }

  async calculateCurrentInstallment(compra) {
    const cuotasGeneradas = await this.getGeneratedInstallmentsCount(compra);
    return cuotasGeneradas + 1;
  }

  async calculateInstallmentAmount(compra) {
    // Si es cuota única, devolver el monto total
    if (!compra.cantidad_cuotas || compra.cantidad_cuotas === 1) {
      return compra.monto_total;
    }

    // Para múltiples cuotas, dividir el monto
    return Math.round((compra.monto_total / compra.cantidad_cuotas) * 100) / 100;
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

  getType() {
    return 'compra';
  }

  validateSource(compra) {
    return super.validateSource(compra) &&
           compra.monto_total &&
           compra.fecha;
  }
}