import { BaseController } from './base.controller.js';
import { IngresoUnico, FuenteIngreso } from '../../models/index.js';
import { IngresoUnicoService } from '../../services/ingresoUnico.service.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import logger from '../../utils/logger.js';

export class IngresoUnicoController extends BaseController {
  constructor() {
    super(IngresoUnico, 'Ingreso Único');
    this.ingresoUnicoService = new IngresoUnicoService();
  }

  getIncludes() {
    return [
      { model: FuenteIngreso, as: 'fuenteIngreso' }
    ];
  }

  getRelationships() {
    return {
      fuente_ingreso_id: { model: FuenteIngreso, name: 'Fuente de Ingreso' }
    };
  }

  // Crear ingreso único
  async create(req, res) {
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de IngresoUnico
      if (!this.validateIngresoUnicoFields(req.body)) {
        return sendError(res, 400, 'Campos inválidos', 'Los campos monto, fecha y fuente_ingreso_id son requeridos');
      }

      // Normalizar fecha (YYYY-MM-DD)
      const fechaParaBD = new Date(req.body.fecha).toISOString().split('T')[0];

      // Crear ingreso único usando el servicio
      const ingresoUnico = await this.ingresoUnicoService.createForUser({
        ...req.body,
        fecha: fechaParaBD
      }, req.user.id);

      logger.info('Ingreso único creado exitosamente:', { ingresoUnico_id: ingresoUnico.id });

      // Recargar con asociaciones
      const ingresoConAsociaciones = await this.model.findByPk(ingresoUnico.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, ingresoConAsociaciones, 201);
    } catch (error) {
      logger.error('Error al crear ingreso único:', { error });
      return sendError(res, 500, 'Error al crear ingreso único', error.message);
    }
  }

  // Obtener ingreso único por ID (con validación de usuario)
  async getById(req, res) {
    try {
      const ingresoUnico = await this.ingresoUnicoService.findByIdAndUser(req.params.id, req.user.id);

      if (!ingresoUnico) {
        return sendError(res, 404, 'Ingreso único no encontrado');
      }

      return sendSuccess(res, ingresoUnico);
    } catch (error) {
      logger.error('Error al obtener ingreso único:', { error });
      return sendError(res, 500, 'Error al obtener ingreso único', error.message);
    }
  }

  // Actualizar ingreso único
  async update(req, res) {
    try {
      // Buscar el ingreso único que pertenece al usuario autenticado
      const ingresoUnico = await this.ingresoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!ingresoUnico) {
        return sendError(res, 404, 'Ingreso único no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      // Normalizar fecha si se está actualizando
      const updateData = { ...req.body };
      if (updateData.fecha) {
        updateData.fecha = new Date(updateData.fecha).toISOString().split('T')[0];
      }

      // Recalculate currency amounts if monto changes
      if (updateData.monto) {
        const monedaOrigen = updateData.moneda_origen || ingresoUnico.moneda_origen || 'ARS';
        try {
          const currencies = await ExchangeRateService.calculateBothCurrencies(updateData.monto, monedaOrigen);
          updateData.monto_ars = currencies.monto_ars;
          updateData.monto_usd = currencies.monto_usd;
          updateData.tipo_cambio_usado = currencies.tipo_cambio_usado;
        } catch (exchangeError) {
          logger.warn('Exchange rate conversion failed during update', { error: exchangeError.message });
        }
      }

      // Actualizar usando el servicio
      const updatedIngreso = await this.ingresoUnicoService.update(ingresoUnico.id, updateData);

      logger.info('Ingreso único actualizado exitosamente:', { id: ingresoUnico.id });

      // Recargar datos actualizados
      const ingresoActualizado = await this.model.findByPk(ingresoUnico.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, ingresoActualizado);
    } catch (error) {
      logger.error('Error al actualizar ingreso único:', { error });
      return sendError(res, 500, 'Error al actualizar ingreso único', error.message);
    }
  }

  // Eliminar ingreso único
  async delete(req, res) {
    try {
      // Buscar el ingreso único que pertenece al usuario autenticado
      const ingresoUnico = await this.ingresoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!ingresoUnico) {
        return sendError(res, 404, 'Ingreso único no encontrado');
      }

      // Eliminar ingreso único
      await this.ingresoUnicoService.deleteForUser(req.params.id, req.user.id);

      logger.info('Ingreso único eliminado exitosamente:', { id: ingresoUnico.id });

      return sendSuccess(res, {
        message: 'Ingreso único eliminado correctamente'
      });
    } catch (error) {
      logger.error('Error al eliminar ingreso único:', { error });
      return sendError(res, 500, 'Error al eliminar ingreso único', error.message);
    }
  }

  // Obtener ingresos únicos con filtros y paginación
  async getWithFilters(req, res) {
    try {
      const {
        fuente_ingreso_id,
        fecha_desde,
        fecha_hasta,
        monto_min,
        monto_max,
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
      if (fuente_ingreso_id) where.fuente_ingreso_id = fuente_ingreso_id;

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

        const ingresosUnicos = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: ingresosUnicos.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < ingresosUnicos.count,
          hasPrev: parseInt(offset) > 0
        };

        return sendPaginatedSuccess(res, ingresosUnicos.rows, pagination);
      } else {
        const ingresosUnicos = await this.model.findAll(queryOptions);
        return sendSuccess(res, ingresosUnicos);
      }
    } catch (error) {
      logger.error('Error al obtener ingresos únicos con filtros:', { error });
      return sendError(res, 500, 'Error al obtener ingresos únicos', error.message);
    }
  }

  // Validaciones específicas de IngresoUnico
  validateIngresoUnicoFields(data) {
    return data.monto && data.fecha && data.fuente_ingreso_id;
  }
}

// Crear instancia del controlador
const ingresoUnicoController = new IngresoUnicoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerIngresoUnicoPorId = ingresoUnicoController.getById.bind(ingresoUnicoController);
export const obtenerIngresosUnicosConFiltros = ingresoUnicoController.getWithFilters.bind(ingresoUnicoController);
export const crearIngresoUnico = ingresoUnicoController.create.bind(ingresoUnicoController);
export const actualizarIngresoUnico = ingresoUnicoController.update.bind(ingresoUnicoController);
export const eliminarIngresoUnico = ingresoUnicoController.delete.bind(ingresoUnicoController);
