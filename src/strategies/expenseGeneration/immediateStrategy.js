import { BaseExpenseGenerationStrategy } from './baseStrategy.js';
import { Gasto } from '../../models/index.js';
import logger from '../../utils/logger.js';

/**
 * Estrategia para gastos únicos - Generación inmediata
 * Los gastos únicos se procesan al momento de crearlos, sin programación
 *
 * 💱 Multi-currency: Los montos ya vienen calculados en el GastoUnico
 * (se calculan al momento de crear el GastoUnico en el controller)
 */
export class ImmediateExpenseStrategy extends BaseExpenseGenerationStrategy {
  async generate(gastoUnico, transaction = null) {
    if (!this.validateSource(gastoUnico)) {
      throw new Error('GastoUnico inválido para generación');
    }

    try {
      // Normalizar fecha (YYYY-MM-DD)
      const fechaParaBD = new Date(gastoUnico.fecha).toISOString().split('T')[0];

      // 💱 Usar montos ya calculados (vienen del GastoUnico con conversión hecha)
      const gastoData = this.createGastoData(gastoUnico, {
        fecha: fechaParaBD,
        monto_ars: gastoUnico.monto_ars || gastoUnico.monto, // Backward compatibility
        monto_usd: gastoUnico.monto_usd || null
      });

      const gasto = await Gasto.create(gastoData, {
        transaction,
        fields: Object.keys(gastoData)
      });

      logger.info('Gasto generado con estrategia inmediata (multi-moneda):', {
        gasto_id: gasto.id,
        gastoUnico_id: gastoUnico.id,
        monto_ars: gasto.monto_ars,
        monto_usd: gasto.monto_usd,
        moneda_origen: gastoUnico.moneda_origen
      });

      return gasto;
    } catch (error) {
      logger.error('Error en estrategia inmediata:', {
        error: error.message,
        gastoUnico_id: gastoUnico.id
      });
      throw error;
    }
  }

  async shouldGenerate(gastoUnico) {
    // Los gastos únicos siempre se generan inmediatamente
    return !gastoUnico.procesado;
  }

  getType() {
    return 'unico';
  }

  validateSource(gastoUnico) {
    return super.validateSource(gastoUnico) &&
           gastoUnico.monto &&
           gastoUnico.fecha;
  }
}
