import { BaseController } from './base.controller.js';
import { Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { FilterBuilder, buildQueryOptions, buildPagination } from '../../utils/filterBuilder.js';
import { buildDateRangeWhere, buildResumen, GASTOS_AGRUPACIONES } from '../../utils/aggregationHelper.js';

export class GastoController extends BaseController {
  constructor() {
    super(Gasto, 'Gasto');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' },
      { model: FrecuenciaGasto, as: 'frecuencia' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' },
      frecuencia_gasto_id: { model: FrecuenciaGasto, name: 'Frecuencia' }
    };
  }

  // Override getAll to filter by user
  async getAll(req, res) {
    try {
      const items = await this.model.findAll({
        where: {
          usuario_id: req.user.id
        },
        include: this.getIncludes()
      });
      return sendSuccess(res, items);
    } catch (error) {
      logger.error(`Error al obtener ${this.modelName}:`, { error });
      return sendError(res, 500, `Error al obtener ${this.modelName}`, error.message);
    }
  }

  // Override getById to filter by user
  async getById(req, res) {
    try {
      const item = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        },
        include: this.getIncludes()
      });

      if (!item) {
        return sendError(res, 404, `${this.modelName} no encontrado`);
      }

      return sendSuccess(res, item);
    } catch (error) {
      logger.error(`Error al obtener ${this.modelName}:`, { error });
      return sendError(res, 500, `Error al obtener ${this.modelName}`, error.message);
    }
  }

  // Override create to add user context
  async create(req, res) {
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      const item = await this.model.create({
        ...req.body,
        usuario_id: req.user.id
      });
      logger.info(`${this.modelName} creado:`, { id: item.id });

      return sendSuccess(res, item, 201);
    } catch (error) {
      logger.error(`Error al crear ${this.modelName}:`, { error });
      return sendError(res, 500, `Error al crear ${this.modelName}`, error.message);
    }
  }

  // Override update to filter by user
  async update(req, res) {
    try {
      const item = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!item) {
        return sendError(res, 404, `${this.modelName} no encontrado`);
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }

      await item.update(req.body);
      logger.info(`${this.modelName} actualizado:`, { id: item.id });

      return sendSuccess(res, item);
    } catch (error) {
      logger.error(`Error al actualizar ${this.modelName}:`, { error });
      return sendError(res, 500, `Error al actualizar ${this.modelName}`, error.message);
    }
  }

  // Override delete to filter by user
  async delete(req, res) {
    try {
      const item = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!item) {
        return sendError(res, 404, `${this.modelName} no encontrado`);
      }

      await item.destroy();
      logger.info(`${this.modelName} eliminado:`, { id: req.params.id });

      return sendSuccess(res, { message: `${this.modelName} eliminado correctamente` });
    } catch (error) {
      logger.error(`Error al eliminar ${this.modelName}:`, { error });
      return sendError(res, 500, `Error al eliminar ${this.modelName}`, error.message);
    }
  }

  // Método para generar todos los gastos pendientes (endpoint manual)
  async generatePendingGastos(req, res) {
    try {
      const userId = req.user.id;
      logger.info('Iniciando generación manual de gastos pendientes...', { userId });
      // Usar el método completo que incluye gastos únicos para procesamiento manual
      // Filtrar solo por el usuario autenticado
      const results = await GastoGeneratorService.generatePendingExpenses(userId);

      const summary = {
        total_generated: results.success.length,
        total_errors: results.errors.length,
        breakdown: {
          recurrentes: results.success.filter(r => r.type === 'recurrente').length,
          debitos: results.success.filter(r => r.type === 'debito').length,
          compras: results.success.filter(r => r.type === 'compra').length,
          unicos: results.success.filter(r => r.type === 'unico').length
        },
        type: 'manual'
      };

      logger.info('Generación manual de gastos completada exitosamente', { summary });

      const responseData = {
        summary,
        details: results
      };

      return sendSuccess(res, responseData, 200, 'Generación manual de gastos completada exitosamente');
    } catch (error) {
      logger.error('Error en la generación manual de gastos:', { error });
      return sendError(res, 500, 'Error al generar gastos pendientes', error.message);
    }
  }

  // Método para obtener gastos con filtros
  async getWithFilters(req, res) {
    try {
      const {
        categoria_gasto_id, importancia_gasto_id, frecuencia_gasto_id,
        tipo_pago_id, tarjeta_id, fecha_desde, fecha_hasta,
        monto_min_ars, monto_max_ars, monto_min_usd, monto_max_usd,
        tipo_origen, id_origen,
        limit, offset = 0, orderBy = 'fecha', orderDirection = 'DESC'
      } = req.query;

      // Construir filtros usando FilterBuilder
      const where = new FilterBuilder(req.user.id)
        .addOptionalIds({
          categoria_gasto_id, importancia_gasto_id, frecuencia_gasto_id,
          tipo_pago_id, tarjeta_id, tipo_origen, id_origen
        })
        .addDateRange('fecha', fecha_desde, fecha_hasta)
        .addNumberRange('monto_ars', monto_min_ars, monto_max_ars)
        .addNumberRange('monto_usd', monto_min_usd, monto_max_usd)
        .build();

      const queryOptions = buildQueryOptions({
        where,
        includes: this.getIncludes(),
        orderBy, orderDirection, limit, offset
      });

      if (limit) {
        const gastos = await this.model.findAndCountAll(queryOptions);
        const pagination = buildPagination(gastos.count, limit, offset);
        return sendPaginatedSuccess(res, gastos.rows, pagination);
      } else {
        const gastos = await this.model.findAll(queryOptions);
        return sendSuccess(res, gastos);
      }
    } catch (error) {
      logger.error('Error al obtener gastos con filtros:', { error });
      return sendError(res, 500, 'Error al obtener gastos', error.message);
    }
  }

  // Método para búsquedas compuestas (POST con body)
  async searchGastos(req, res) {
    try {
      const {
        categoria_gasto_id, importancia_gasto_id, frecuencia_gasto_id,
        tipo_pago_id, tarjeta_id, fecha_desde, fecha_hasta,
        monto_min_ars, monto_max_ars, monto_min_usd, monto_max_usd,
        tipo_origen, id_origen,
        limit = 100, offset = 0, orderBy = 'fecha', orderDirection = 'DESC'
      } = req.body;

      // Construir filtros usando FilterBuilder
      const where = new FilterBuilder(req.user.id)
        .addOptionalIds({
          categoria_gasto_id, importancia_gasto_id, frecuencia_gasto_id,
          tipo_pago_id, tarjeta_id, tipo_origen, id_origen
        })
        .addDateRange('fecha', fecha_desde, fecha_hasta)
        .addNumberRange('monto_ars', monto_min_ars, monto_max_ars)
        .addNumberRange('monto_usd', monto_min_usd, monto_max_usd)
        .build();

      const queryOptions = buildQueryOptions({
        where,
        includes: this.getIncludes(),
        orderBy, orderDirection, limit, offset
      });

      const gastos = await this.model.findAndCountAll(queryOptions);
      const pagination = buildPagination(gastos.count, limit, offset);

      return sendPaginatedSuccess(res, gastos.rows, pagination);
    } catch (error) {
      logger.error('Error en búsqueda de gastos:', { error });
      return sendError(res, 500, 'Error en búsqueda de gastos', error.message);
    }
  }

  // Método para obtener resumen de gastos por período
  async getSummary(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;

      // Construir WHERE con rango de fechas (por defecto mes actual)
      const whereClause = buildDateRangeWhere(req.user.id, fecha_desde, fecha_hasta, 'fecha');

      const gastos = await this.model.findAll({
        where: whereClause,
        include: this.getIncludes()
      });

      // Construir resumen usando helper de agregación
      const resumen = buildResumen(gastos, fecha_desde, fecha_hasta, GASTOS_AGRUPACIONES);

      return sendSuccess(res, resumen);
    } catch (error) {
      logger.error('Error al obtener resumen de gastos:', { error });
      return sendError(res, 500, 'Error al obtener resumen de gastos', error.message);
    }
  }
}

// Crear instancia del controlador
const gastoController = new GastoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerTodosGastos = gastoController.getAll.bind(gastoController);
export const obtenerGastoPorId = gastoController.getById.bind(gastoController);
export const crearGasto = gastoController.create.bind(gastoController);
export const actualizarGasto = gastoController.update.bind(gastoController);
export const eliminarGasto = gastoController.delete.bind(gastoController);
export const obtenerGastosConFiltros = gastoController.getWithFilters.bind(gastoController);
export const obtenerResumenGastos = gastoController.getSummary.bind(gastoController);
export const generarGastosPendientes = gastoController.generatePendingGastos.bind(gastoController);
export const buscarGastos = gastoController.searchGastos.bind(gastoController);
