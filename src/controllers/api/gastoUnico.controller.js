import { BaseController } from './base.controller.js';
import { GastoUnico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import { getService } from '../../middlewares/container.middleware.js';
import logger from '../../utils/logger.js';

/**
 * 🏗️ GastoUnicoController - Uses DI container for services
 *
 * The service is resolved from the container per-request,
 * ensuring proper scoping and testability.
 */
export class GastoUnicoController extends BaseController {
  constructor() {
    super(GastoUnico, 'Gasto Único');
  }

  /**
   * Get the GastoUnicoService from the request container
   * @param {Request} req - Express request with container
   * @returns {GastoUnicoService} Service instance
   */
  getGastoUnicoService(req) {
    return getService(req, 'gastoUnicoService');
  }

  /**
   * Get the ExchangeRateService from the request container
   * @param {Request} req - Express request with container
   * @returns {ExchangeRateServiceInstance} Service instance
   */
  getExchangeRateService(req) {
    return getService(req, 'exchangeRateService');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' }
    };
  }

  /**
   * Create gasto único - delegates to service (which handles transactions)
   * 🏗️ Controller only coordinates, service handles business logic + transactions
   */
  async create(req, res) {
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de GastoUnico
      if (!this.validateGastoUnicoFields(req.body)) {
        return sendError(res, 400, 'Campos inválidos', 'Los campos monto y fecha son requeridos');
      }

      // Normalizar fecha (YYYY-MM-DD)
      const fechaParaBD = new Date(req.body.fecha).toISOString().split('T')[0];

      // Get service from DI container
      const gastoUnicoService = this.getGastoUnicoService(req);

      // Service handles transaction internally
      const gastoUnico = await gastoUnicoService.createForUser({
        ...req.body,
        fecha: fechaParaBD
      }, req.user.id);

      logger.info('Gasto único creado exitosamente:', { gastoUnico_id: gastoUnico.id });

      return sendSuccess(res, gastoUnico, 201);
    } catch (error) {
      logger.error('Error al crear gasto único:', { error });
      return sendError(res, 500, 'Error al crear gasto único', error.message);
    }
  }

  /**
   * Update gasto único - delegates to service (which handles transactions)
   * 🏗️ Controller validates, service handles business logic + transactions
   */
  async update(req, res) {
    try {
      // Get service from DI container
      const gastoUnicoService = this.getGastoUnicoService(req);

      // Buscar el gasto único que pertenece al usuario autenticado
      const gastoUnico = await gastoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!gastoUnico) {
        return sendError(res, 404, 'Gasto único no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos si se están actualizando
      if (req.body.fecha && !this.validateGastoUnicoFields(req.body)) {
        return sendError(res, 400, 'Campos inválidos', 'La fecha es requerida y debe ser válida');
      }

      // Normalizar fecha si se está actualizando
      const updateData = { ...req.body };
      if (updateData.fecha) {
        updateData.fecha = new Date(updateData.fecha).toISOString().split('T')[0];
      }

      // Recalculate currency amounts if monto changes
      if (updateData.monto) {
        const exchangeRateService = this.getExchangeRateService(req);
        const monedaOrigen = updateData.moneda_origen || gastoUnico.moneda_origen || 'ARS';
        const currencies = await exchangeRateService.calculateBothCurrencies(updateData.monto, monedaOrigen);
        updateData.monto_ars = currencies.monto_ars;
        updateData.monto_usd = currencies.monto_usd;
        updateData.tipo_cambio_usado = currencies.tipo_cambio_usado;
      }

      // Service handles transaction internally (updates both GastoUnico and associated Gasto)
      const updatedGastoUnico = await gastoUnicoService.update(gastoUnico.id, updateData);

      logger.info('Gasto único y gasto asociado actualizados exitosamente:', { id: gastoUnico.id });

      return sendSuccess(res, updatedGastoUnico);
    } catch (error) {
      logger.error('Error al actualizar gasto único:', { error });
      return sendError(res, 500, 'Error al actualizar gasto único', error.message);
    }
  }

  /**
   * Delete gasto único - delegates to service (which handles transactions)
   * 🏗️ Controller validates ownership, service handles cascading deletes
   */
  async delete(req, res) {
    try {
      // Get service from DI container
      const gastoUnicoService = this.getGastoUnicoService(req);

      // Buscar el gasto único que pertenece al usuario autenticado
      const gastoUnico = await gastoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!gastoUnico) {
        return sendError(res, 404, 'Gasto único no encontrado');
      }

      // Service handles cascading delete with transaction
      const result = await gastoUnicoService.deleteWithAssociatedGasto(gastoUnico.id);

      logger.info('Gasto único y gasto asociado eliminados exitosamente:', {
        gastoUnico_id: gastoUnico.id,
        gastos_eliminados: result.gastosEliminados
      });

      return sendSuccess(res, {
        message: 'Gasto único eliminado correctamente',
        gastos_eliminados: result.gastosEliminados
      });
    } catch (error) {
      logger.error('Error al eliminar gasto único:', { error });
      return sendError(res, 500, 'Error al eliminar gasto único', error.message);
    }
  }

  // Método para obtener gastos únicos con filtros y paginación
  async getWithFilters(req, res) {
    try {
      const {
        categoria_gasto_id,
        importancia_gasto_id,
        tipo_pago_id,
        tarjeta_id,
        fecha_desde,
        fecha_hasta,
        monto_min,
        monto_max,
        procesado,
        limit,
        offset = 0,
        orderBy = 'fecha',
        orderDirection = 'DESC'
      } = req.query;

      // SIEMPRE filtrar por usuario autenticado
      const where = {
        usuario_id: req.user.id
      };

      // Filtros por IDs
      if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
      if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
      if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;
      if (tarjeta_id) where.tarjeta_id = tarjeta_id;

      // Filtro por estado procesado
      if (procesado !== undefined) where.procesado = procesado === 'true';

      // Filtro por rango de fechas
      if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
      }

      // Filtro por rango de montos
      if (monto_min || monto_max) {
        where.monto = {};
        if (monto_min) where.monto[Op.gte] = Number(monto_min);
        if (monto_max) where.monto[Op.lte] = Number(monto_max);
      }

      const queryOptions = {
        where,
        include: this.getIncludes(),
        order: [[orderBy, orderDirection]]
      };

      if (limit) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);

        const gastosUnicos = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: gastosUnicos.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < gastosUnicos.count,
          hasPrev: parseInt(offset) > 0
        };

        return sendPaginatedSuccess(res, gastosUnicos.rows, pagination);
      } else {
        const gastosUnicos = await this.model.findAll(queryOptions);
        return sendSuccess(res, gastosUnicos);
      }
    } catch (error) {
      logger.error('Error al obtener gastos únicos con filtros:', { error });
      return sendError(res, 500, 'Error al obtener gastos únicos', error.message);
    }
  }


  // Validaciones específicas de GastoUnico
  validateGastoUnicoFields(data) {
    return data.monto && data.fecha;
  }
}

// Crear instancia del controlador
const gastoUnicoController = new GastoUnicoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerGastoUnicoPorId = gastoUnicoController.getById.bind(gastoUnicoController);
export const obtenerGastosUnicosConFiltros = gastoUnicoController.getWithFilters.bind(gastoUnicoController);
export const crearGastoUnico = gastoUnicoController.create.bind(gastoUnicoController);
export const actualizarGastoUnico = gastoUnicoController.update.bind(gastoUnicoController);
export const eliminarGastoUnico = gastoUnicoController.delete.bind(gastoUnicoController);
