import { Op } from 'sequelize';
import { TipoCambio } from '../models/index.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';
import axios from 'axios';

/**
 * 💱 ExchangeRateService - Manejo completo de tipos de cambio USD-ARS
 *
 * Funcionalidades:
 * 1. Obtener tipo de cambio actual o histórico
 * 2. Conversión automática ARS <-> USD
 * 3. Actualización manual o automática desde APIs externas
 * 4. Caché en memoria para optimización
 *
 * Estrategia:
 * - Para gastos pasados: usa el TC del día del gasto
 * - Para gastos futuros: usa el TC más reciente disponible
 * - Para proyecciones: usa el TC actual con advertencia
 */
export class ExchangeRateService {
  // Cache en memoria (TTL: 1 hora)
  static cache = {
    current: null,
    lastUpdate: null,
    TTL: 1000 * 60 * 60 // 1 hora
  };

  /**
   * Obtiene el tipo de cambio actual (el más reciente)
   * Usa cache si está disponible y no expiró
   */
  static async getCurrentRate() {
    try {
      // Verificar cache
      if (this.isCacheValid()) {
        logger.debug('Usando tipo de cambio desde cache');
        return this.cache.current;
      }

      // Buscar el tipo de cambio más reciente activo
      const tipoCambio = await TipoCambio.findOne({
        where: { activo: true },
        order: [['fecha', 'DESC']]
      });

      if (!tipoCambio) {
        // No hay ningún tipo de cambio en la BD
        const error = new Error('No hay tipo de cambio configurado en el sistema');
        error.code = 'NO_EXCHANGE_RATE';
        logger.error('No se encontró tipo de cambio en la base de datos');
        throw error;
      }

      // Actualizar cache
      this.cache.current = tipoCambio;
      this.cache.lastUpdate = Date.now();

      logger.debug('Tipo de cambio obtenido desde BD', {
        fecha: tipoCambio.fecha,
        venta: tipoCambio.valor_venta_usd_ars,
        fuente: tipoCambio.fuente
      });

      return tipoCambio;
    } catch (error) {
      logger.error('Error al obtener tipo de cambio actual', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtiene el tipo de cambio para una fecha específica
   * Si no existe para esa fecha, busca el más cercano anterior
   */
  static async getRateForDate(fecha) {
    try {
      const fechaStr = moment(fecha).format('YYYY-MM-DD');

      // Buscar tipo de cambio exacto para la fecha
      let tipoCambio = await TipoCambio.findOne({
        where: {
          fecha: fechaStr,
          activo: true
        }
      });

      if (tipoCambio) {
        logger.debug('Tipo de cambio encontrado para fecha exacta', {
          fecha: fechaStr,
          venta: tipoCambio.valor_venta_usd_ars
        });
        return tipoCambio;
      }

      // Si no existe, buscar el más cercano anterior
      tipoCambio = await TipoCambio.findOne({
        where: {
          fecha: { [Op.lte]: fechaStr },
          activo: true
        },
        order: [['fecha', 'DESC']]
      });

      if (!tipoCambio) {
        // Fallback: usar el actual si no hay histórico
        logger.warn('No se encontró TC histórico, usando actual', { fecha: fechaStr });
        return await this.getCurrentRate();
      }

      logger.debug('Usando tipo de cambio anterior más cercano', {
        fechaSolicitada: fechaStr,
        fechaUsada: tipoCambio.fecha,
        venta: tipoCambio.valor_venta_usd_ars
      });

      return tipoCambio;
    } catch (error) {
      logger.error('Error al obtener tipo de cambio para fecha', {
        error: error.message,
        fecha
      });
      throw error;
    }
  }

  /**
   * Convierte monto de ARS a USD usando tipo de cambio dado
   * @param {number} montoARS - Monto en pesos argentinos
   * @param {Object} tipoCambio - Objeto TipoCambio o valor numérico
   * @param {string} tipo - 'compra' o 'venta' (default: 'venta')
   * @returns {number} Monto en USD con 2 decimales
   */
  static convertARStoUSD(montoARS, tipoCambio, tipo = 'venta') {
    const valor = tipo === 'compra'
      ? tipoCambio.valor_compra_usd_ars || tipoCambio
      : tipoCambio.valor_venta_usd_ars || tipoCambio;

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      throw new Error('Tipo de cambio inválido: el valor debe ser mayor a cero');
    }

    const montoUSD = parseFloat(montoARS) / valorNum;
    return parseFloat(montoUSD.toFixed(2));
  }

  /**
   * Convierte monto de USD a ARS usando tipo de cambio dado
   * @param {number} montoUSD - Monto en dólares
   * @param {Object} tipoCambio - Objeto TipoCambio o valor numérico
   * @param {string} tipo - 'compra' o 'venta' (default: 'compra')
   * @returns {number} Monto en ARS con 2 decimales
   */
  static convertUSDtoARS(montoUSD, tipoCambio, tipo = 'compra') {
    const valor = tipo === 'compra'
      ? tipoCambio.valor_compra_usd_ars || tipoCambio
      : tipoCambio.valor_venta_usd_ars || tipoCambio;

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      throw new Error('Tipo de cambio inválido: el valor debe ser mayor a cero');
    }

    const montoARS = parseFloat(montoUSD) * valorNum;
    return parseFloat(montoARS.toFixed(2));
  }

  /**
   * Calcula ambas monedas basándose en la moneda origen
   * @param {number} monto - Monto en la moneda origen
   * @param {string} monedaOrigen - 'ARS' o 'USD'
   * @param {Object} tipoCambio - Objeto TipoCambio (opcional, usa actual si no se provee)
   * @returns {Object} { monto_ars, monto_usd, tipo_cambio_usado }
   */
  static async calculateBothCurrencies(monto, monedaOrigen, tipoCambio = null) {
    try {
      // Si no se provee TC, usar el actual
      const tc = tipoCambio || await this.getCurrentRate();

      let montoARS, montoUSD, tipoCambioUsado;

      if (monedaOrigen === 'ARS') {
        montoARS = parseFloat(monto);
        montoUSD = this.convertARStoUSD(monto, tc);
        tipoCambioUsado = tc.valor_venta_usd_ars; // ARS→USD usa venta
      } else if (monedaOrigen === 'USD') {
        montoUSD = parseFloat(monto);
        montoARS = this.convertUSDtoARS(monto, tc);
        tipoCambioUsado = tc.valor_compra_usd_ars; // USD→ARS usa compra
      } else {
        throw new Error(`Moneda origen inválida: ${monedaOrigen}`);
      }

      return {
        monto_ars: montoARS,
        monto_usd: montoUSD,
        tipo_cambio_usado: tipoCambioUsado,
        tipo_cambio_fecha: tc.fecha
      };
    } catch (error) {
      logger.error('Error al calcular ambas monedas', {
        error: error.message,
        monto,
        monedaOrigen
      });
      throw error;
    }
  }

  /**
   * Actualiza o crea un tipo de cambio manualmente
   * @param {string} fecha - Fecha del tipo de cambio (YYYY-MM-DD)
   * @param {number} valorCompra - Valor de compra USD-ARS
   * @param {number} valorVenta - Valor de venta USD-ARS
   * @param {string} observaciones - Notas adicionales (opcional)
   */
  static async setManualRate(fecha, valorCompra, valorVenta, observaciones = null) {
    try {
      const fechaStr = moment(fecha).format('YYYY-MM-DD');

      // Validaciones
      if (valorVenta < valorCompra) {
        throw new Error('El valor de venta debe ser mayor o igual al valor de compra');
      }

      if (valorCompra <= 0 || valorVenta <= 0) {
        throw new Error('Los valores deben ser mayores a cero');
      }

      // Upsert (crear o actualizar)
      const result = await TipoCambio.upsert({
        fecha: fechaStr,
        valor_compra_usd_ars: parseFloat(parseFloat(valorCompra).toFixed(2)),
        valor_venta_usd_ars: parseFloat(parseFloat(valorVenta).toFixed(2)),
        fuente: 'manual',
        observaciones,
        activo: true
      }, {
        returning: true
      });

      // Manejar diferentes formatos de retorno de upsert
      // Sequelize puede retornar [instance, created] o solo instance dependiendo de la versión/config
      let tipoCambio, created;
      if (Array.isArray(result)) {
        [tipoCambio, created] = result;
      } else {
        tipoCambio = result;
        created = false;
      }

      // Si upsert no retorna el registro, buscarlo
      if (!tipoCambio) {
        tipoCambio = await TipoCambio.findOne({ where: { fecha: fechaStr } });
      }

      // Invalidar cache
      this.invalidateCache();

      logger.info(`Tipo de cambio ${created ? 'creado' : 'actualizado'} manualmente`, {
        fecha: fechaStr,
        compra: valorCompra,
        venta: valorVenta
      });

      return tipoCambio;
    } catch (error) {
      logger.error('Error al establecer tipo de cambio manual', {
        error: error.message,
        fecha,
        valorCompra,
        valorVenta
      });
      throw error;
    }
  }

  /**
   * Actualiza tipo de cambio desde API externa (Banco Central Argentina)
   * Endpoint: https://api.estadisticasbcra.com/usd_of
   */
  static async updateFromBCRAAPI() {
    try {
      const today = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

      // Verificar si ya existe para hoy
      const existing = await TipoCambio.findOne({
        where: { fecha: today }
      });

      if (existing && existing.fuente !== 'manual') {
        logger.info('Tipo de cambio ya actualizado hoy desde API');
        return existing;
      }

      // Llamar a API del BCRA (ejemplo - ajustar según API real)
      // Nota: Esta API requiere token, configurar en .env
      const response = await axios.get('https://api.estadisticasbcra.com/usd_of', {
        headers: {
          'Authorization': `Bearer ${process.env.BCRA_API_TOKEN || ''}`
        },
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('API BCRA no retornó datos');
      }

      // Tomar el valor más reciente
      const latestRate = response.data[response.data.length - 1];
      const valor = parseFloat(latestRate.v);

      // Crear registro (usar mismo valor para compra/venta si API no los diferencia)
      const tipoCambio = await this.setManualRate(
        today,
        valor * 0.995, // Compra: 0.5% menos
        valor,
        'Actualizado automáticamente desde API BCRA'
      );

      // Cambiar fuente a api_bcra
      await tipoCambio.update({ fuente: 'api_bcra' });

      logger.info('Tipo de cambio actualizado desde API BCRA', {
        fecha: today,
        valor
      });

      return tipoCambio;
    } catch (error) {
      logger.error('Error al actualizar desde API BCRA', {
        error: error.message,
        response: error.response?.data
      });

      // No throw - permitir que la app continue con el último TC conocido
      return null;
    }
  }

  /**
   * Actualiza tipo de cambio desde DolarAPI (alternativa gratuita)
   * Endpoint: https://dolarapi.com/v1/dolares/blue
   */
  static async updateFromDolarAPI() {
    try {
      const today = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

      // Verificar si ya existe para hoy
      const existing = await TipoCambio.findOne({
        where: { fecha: today }
      });

      if (existing && existing.fuente !== 'manual') {
        logger.info('Tipo de cambio ya actualizado hoy desde API');
        return existing;
      }

      // Llamar a DolarAPI (gratuita, no requiere token) - Dólar Blue
      const response = await axios.get('https://dolarapi.com/v1/dolares/blue', {
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('DolarAPI no retornó datos');
      }

      const { compra, venta } = response.data;

      // Crear registro
      const tipoCambio = await this.setManualRate(
        today,
        parseFloat(compra),
        parseFloat(venta),
        'Actualizado automáticamente desde DolarAPI'
      );

      // Cambiar fuente a api_dolar_api
      await tipoCambio.update({ fuente: 'api_dolar_api' });

      logger.info('Tipo de cambio actualizado desde DolarAPI', {
        fecha: today,
        compra,
        venta
      });

      return tipoCambio;
    } catch (error) {
      logger.error('Error al actualizar desde DolarAPI', {
        error: error.message,
        response: error.response?.data
      });

      // No throw - permitir que la app continue con el último TC conocido
      return null;
    }
  }

  /**
   * Obtiene historial de tipos de cambio
   * @param {string} fechaDesde - Fecha inicio (YYYY-MM-DD)
   * @param {string} fechaHasta - Fecha fin (YYYY-MM-DD)
   * @param {number} limit - Límite de resultados
   */
  static async getHistory(fechaDesde = null, fechaHasta = null, limit = 30) {
    try {
      const where = { activo: true };

      if (fechaDesde || fechaHasta) {
        where.fecha = {};
        if (fechaDesde) where.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) where.fecha[Op.lte] = fechaHasta;
      }

      const history = await TipoCambio.findAll({
        where,
        order: [['fecha', 'DESC']],
        limit: parseInt(limit)
      });

      return history;
    } catch (error) {
      logger.error('Error al obtener historial de tipos de cambio', {
        error: error.message,
        fechaDesde,
        fechaHasta
      });
      throw error;
    }
  }

  /**
   * Obtiene el historial de tipos de cambio con filtros opcionales
   * @param {Object} filters - Filtros para la consulta
   * @param {string} filters.fecha_desde - Fecha desde (YYYY-MM-DD)
   * @param {string} filters.fecha_hasta - Fecha hasta (YYYY-MM-DD)
   * @param {string} filters.fuente - Fuente del tipo de cambio
   * @param {number} filters.limit - Límite de resultados (default: 30)
   * @returns {Promise<Array>} Array de tipos de cambio históricos
   */
  static async getHistoricalRates(filters = {}) {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        fuente,
        limit = 30
      } = filters;

      const where = { activo: true };

      // Filtro por rango de fechas
      if (fecha_desde || fecha_hasta) {
        where.fecha = {};

        if (fecha_desde) {
          where.fecha[Op.gte] = moment(fecha_desde).format('YYYY-MM-DD');
        }

        if (fecha_hasta) {
          where.fecha[Op.lte] = moment(fecha_hasta).format('YYYY-MM-DD');
        }
      }

      // Filtro por fuente
      if (fuente) {
        where.fuente = fuente;
      }

      const historico = await TipoCambio.findAll({
        where,
        order: [['fecha', 'DESC']],
        limit: parseInt(limit)
      });

      logger.debug('Histórico de tipos de cambio obtenido', {
        total: historico.length,
        filtros: filters
      });

      return historico;
    } catch (error) {
      logger.error('Error al obtener histórico de tipos de cambio', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Verifica si el cache es válido
   * @private
   */
  static isCacheValid() {
    if (!this.cache.current || !this.cache.lastUpdate) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - this.cache.lastUpdate;

    return elapsed < this.cache.TTL;
  }

  /**
   * Invalida el cache
   * @private
   */
  static invalidateCache() {
    this.cache.current = null;
    this.cache.lastUpdate = null;
    logger.debug('Cache de tipo de cambio invalidado');
  }

  /**
   * Obtiene y guarda el tipo de cambio desde APIs externas
   * Intenta DolarAPI primero, luego BCRA como fallback
   * @returns {Promise<Object|null>} El tipo de cambio guardado o null si falla
   */
  static async fetchAndSaveFromExternalAPI() {
    logger.info('💱 Obteniendo tipo de cambio desde API externa...');

    // Intentar primero con DolarAPI (gratuita, más confiable)
    let tipoCambio = await this.updateFromDolarAPI();

    // Si falla, intentar con BCRA
    if (!tipoCambio) {
      logger.warn('⚠️ DolarAPI falló, intentando con BCRA...');
      tipoCambio = await this.updateFromBCRAAPI();
    }

    if (tipoCambio) {
      logger.info('✅ Tipo de cambio obtenido exitosamente', {
        fecha: tipoCambio.fecha,
        venta: tipoCambio.valor_venta_usd_ars,
        fuente: tipoCambio.fuente
      });
    } else {
      logger.error('❌ No se pudo obtener tipo de cambio de ninguna API externa');
    }

    return tipoCambio;
  }

  /**
   * Verifica si existe un tipo de cambio, si no existe lo obtiene de API externa
   * @returns {Promise<Object>} El tipo de cambio existente o recién obtenido
   * @throws {Error} Si no existe y no se puede obtener de APIs
   */
  static async ensureExchangeRateExists() {
    try {
      return await this.getCurrentRate();
    } catch (error) {
      if (error.code === 'NO_EXCHANGE_RATE') {
        logger.info('💱 No hay tipo de cambio configurado, obteniendo desde API...');
        const tipoCambio = await this.fetchAndSaveFromExternalAPI();

        if (!tipoCambio) {
          const newError = new Error('No se pudo obtener tipo de cambio inicial');
          newError.code = 'EXCHANGE_RATE_FETCH_FAILED';
          throw newError;
        }

        return tipoCambio;
      }
      throw error;
    }
  }
}

export default ExchangeRateService;
