import ExchangeRateService from '../../services/exchangeRate.service.js';
import { sendError, sendSuccess } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

/**
 * 💱 Tipo de Cambio Controller
 * Manages exchange rate operations and manual updates
 */
export class TipoCambioController {

  /**
   * GET /api/tipo-cambio/actual
   * Obtiene el tipo de cambio actual (activo)
   */
  async getCurrentRate(req, res) {
    try {
      const tipoCambio = await ExchangeRateService.getCurrentRate();

      if (!tipoCambio) {
        return sendError(res, 404, 'No hay tipo de cambio configurado',
          'Por favor configure un tipo de cambio manualmente o ejecute la actualización desde API');
      }

      return sendSuccess(res, {
        fecha: tipoCambio.fecha,
        valor_compra_usd_ars: parseFloat(tipoCambio.valor_compra_usd_ars),
        valor_venta_usd_ars: parseFloat(tipoCambio.valor_venta_usd_ars),
        fuente: tipoCambio.fuente,
        activo: tipoCambio.activo,
        ultima_actualizacion: tipoCambio.updatedAt
      });
    } catch (error) {
      logger.error('Error al obtener tipo de cambio actual:', { error: error.message });

      // Manejar error específico de tipo de cambio no configurado
      if (error.code === 'NO_EXCHANGE_RATE') {
        return sendError(res, 404, 'No hay tipo de cambio configurado',
          'Por favor configure un tipo de cambio manualmente o ejecute la actualización desde API');
      }

      return sendError(res, 500, 'Error al obtener tipo de cambio', error.message);
    }
  }

  /**
   * GET /api/tipo-cambio/historico
   * Obtiene el historial de tipos de cambio con filtros opcionales
   */
  async getHistorical(req, res) {
    try {
      const { fecha_desde, fecha_hasta, fuente, limit = 30 } = req.query;

      const filters = {};

      if (fecha_desde) {
        filters.fecha_desde = fecha_desde;
      }

      if (fecha_hasta) {
        filters.fecha_hasta = fecha_hasta;
      }

      if (fuente) {
        filters.fuente = fuente;
      }

      filters.limit = parseInt(limit);

      const historico = await ExchangeRateService.getHistoricalRates(filters);

      return sendSuccess(res, {
        total: historico.length,
        filtros: { fecha_desde, fecha_hasta, fuente, limit },
        datos: historico.map(tc => ({
          fecha: tc.fecha,
          valor_compra_usd_ars: parseFloat(tc.valor_compra_usd_ars),
          valor_venta_usd_ars: parseFloat(tc.valor_venta_usd_ars),
          fuente: tc.fuente,
          activo: tc.activo
        }))
      });
    } catch (error) {
      logger.error('Error al obtener histórico de tipos de cambio:', { error: error.message });
      return sendError(res, 500, 'Error al obtener histórico', error.message);
    }
  }

  /**
   * POST /api/tipo-cambio/manual
   * Configura un tipo de cambio manualmente
   * Body: { fecha, valor_compra_usd_ars, valor_venta_usd_ars }
   */
  async setManualRate(req, res) {
    try {
      const { fecha, valor_compra_usd_ars, valor_venta_usd_ars } = req.body;

      // Validar campos requeridos
      if (!valor_venta_usd_ars) {
        return sendError(res, 400, 'Validación fallida',
          'El campo valor_venta_usd_ars es requerido');
      }

      // Validar que sea un número positivo
      const valorVenta = parseFloat(valor_venta_usd_ars);
      if (isNaN(valorVenta) || valorVenta <= 0) {
        return sendError(res, 400, 'Validación fallida',
          'valor_venta_usd_ars debe ser un número positivo');
      }

      let valorCompra = valor_compra_usd_ars ? parseFloat(valor_compra_usd_ars) : null;

      // Si no se proporciona valor de compra, usar el de venta
      if (!valorCompra) {
        valorCompra = valorVenta;
      }

      if (isNaN(valorCompra) || valorCompra <= 0) {
        return sendError(res, 400, 'Validación fallida',
          'valor_compra_usd_ars debe ser un número positivo');
      }

      const tipoCambio = await ExchangeRateService.setManualRate(
        fecha,
        valorCompra,
        valorVenta
      );

      logger.info('Tipo de cambio manual configurado:', {
        fecha: tipoCambio.fecha,
        valor_compra: tipoCambio.valor_compra_usd_ars,
        valor_venta: tipoCambio.valor_venta_usd_ars,
        user_id: req.user?.id
      });

      return sendSuccess(res, {
        mensaje: 'Tipo de cambio configurado exitosamente',
        tipo_cambio: {
          fecha: tipoCambio.fecha,
          valor_compra_usd_ars: parseFloat(tipoCambio.valor_compra_usd_ars),
          valor_venta_usd_ars: parseFloat(tipoCambio.valor_venta_usd_ars),
          fuente: tipoCambio.fuente,
          activo: tipoCambio.activo
        }
      }, 201);
    } catch (error) {
      logger.error('Error al configurar tipo de cambio manual:', {
        error: error.message,
        user_id: req.user?.id
      });
      return sendError(res, 500, 'Error al configurar tipo de cambio', error.message);
    }
  }

  /**
   * POST /api/tipo-cambio/actualizar
   * Actualiza el tipo de cambio desde API externa
   */
  async updateFromAPI(req, res) {
    try {
      const { fuente = 'auto' } = req.body;

      let tipoCambio;

      if (fuente === 'bcra') {
        tipoCambio = await ExchangeRateService.updateFromBCRAAPI();
      } else if (fuente === 'dolarapi') {
        tipoCambio = await ExchangeRateService.updateFromDolarAPI();
      } else {
        // Auto: Intentar primero con DolarAPI, luego BCRA
        tipoCambio = await ExchangeRateService.updateFromDolarAPI();

        if (!tipoCambio) {
          logger.warn('DolarAPI falló, intentando con BCRA...');
          tipoCambio = await ExchangeRateService.updateFromBCRAAPI();
        }
      }

      if (!tipoCambio) {
        return sendError(res, 503, 'Error al actualizar tipo de cambio',
          'No se pudo obtener el tipo de cambio de ninguna fuente externa');
      }

      // Verificar que tipoCambio sea un objeto válido con los campos esperados
      if (typeof tipoCambio !== 'object' || !tipoCambio.fecha) {
        logger.error('tipoCambio no es un objeto válido:', {
          tipo: typeof tipoCambio,
          valor: JSON.stringify(tipoCambio),
          user_id: req.user?.id
        });
        return sendError(res, 500, 'Error al actualizar tipo de cambio',
          'El tipo de cambio retornado no es válido');
      }

      logger.info('Tipo de cambio actualizado desde API:', {
        fecha: tipoCambio.fecha,
        valor_compra: tipoCambio.valor_compra_usd_ars,
        valor_venta: tipoCambio.valor_venta_usd_ars,
        fuente: tipoCambio.fuente || 'no definida',
        user_id: req.user?.id
      });

      return sendSuccess(res, {
        mensaje: 'Tipo de cambio actualizado exitosamente',
        tipo_cambio: {
          fecha: tipoCambio.fecha,
          valor_compra_usd_ars: parseFloat(tipoCambio.valor_compra_usd_ars) || 0,
          valor_venta_usd_ars: parseFloat(tipoCambio.valor_venta_usd_ars) || 0,
          fuente: tipoCambio.fuente || 'desconocida',
          activo: tipoCambio.activo !== false
        }
      });
    } catch (error) {
      logger.error('Error al actualizar tipo de cambio desde API:', {
        error: error.message,
        user_id: req.user?.id
      });
      return sendError(res, 500, 'Error al actualizar tipo de cambio', error.message);
    }
  }

  /**
   * POST /api/tipo-cambio/convertir
   * Convierte un monto entre monedas usando el tipo de cambio actual
   * Body: { monto, moneda_origen: 'ARS'|'USD' }
   */
  async convert(req, res) {
    try {
      const { monto, moneda_origen } = req.body;

      // Validar campos requeridos
      if (!monto || !moneda_origen) {
        return sendError(res, 400, 'Validación fallida',
          'Los campos monto y moneda_origen son requeridos');
      }

      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        return sendError(res, 400, 'Validación fallida',
          'monto debe ser un número positivo');
      }

      if (!['ARS', 'USD'].includes(moneda_origen)) {
        return sendError(res, 400, 'Validación fallida',
          'moneda_origen debe ser ARS o USD');
      }

      const tipoCambio = await ExchangeRateService.getCurrentRate();

      if (!tipoCambio) {
        return sendError(res, 404, 'Tipo de cambio no disponible',
          'No hay tipo de cambio configurado');
      }

      const { monto_ars, monto_usd, tipo_cambio_usado } =
        await ExchangeRateService.calculateBothCurrencies(montoNum, moneda_origen, tipoCambio);

      return sendSuccess(res, {
        monto_original: montoNum,
        moneda_origen,
        conversion: {
          monto_ars,
          monto_usd,
          tipo_cambio_usado,
          fecha_tipo_cambio: tipoCambio.fecha
        }
      });
    } catch (error) {
      logger.error('Error al convertir monto:', { error: error.message });

      // Manejar error específico de tipo de cambio no configurado
      if (error.code === 'NO_EXCHANGE_RATE') {
        return sendError(res, 404, 'Tipo de cambio no disponible',
          'No hay tipo de cambio configurado');
      }

      return sendError(res, 500, 'Error al convertir monto', error.message);
    }
  }
}

// Crear instancia del controlador
const tipoCambioController = new TipoCambioController();

// Exportar métodos
export const obtenerTipoCambioActual = tipoCambioController.getCurrentRate.bind(tipoCambioController);
export const obtenerHistoricoTipoCambio = tipoCambioController.getHistorical.bind(tipoCambioController);
export const configurarTipoCambioManual = tipoCambioController.setManualRate.bind(tipoCambioController);
export const actualizarTipoCambioDesdeAPI = tipoCambioController.updateFromAPI.bind(tipoCambioController);
export const convertirMonto = tipoCambioController.convert.bind(tipoCambioController);
