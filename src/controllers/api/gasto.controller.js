import { BaseController } from './base.controller.js';
import { Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';
import { sendError, sendSuccess, sendPaginatedSuccess } from '../../utils/responseHelper.js';

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

  // Método para generar todos los gastos pendientes (endpoint manual)
  async generatePendingGastos(req, res) {
    try {
      logger.info('Iniciando generación manual de gastos pendientes...');
      // Usar el método completo que incluye gastos únicos para procesamiento manual
      const results = await GastoGeneratorService.generatePendingExpenses();

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
        categoria_gasto_id,
        importancia_gasto_id,
        frecuencia_gasto_id,
        tipo_pago_id,
        tarjeta_id,
        fecha_desde,
        fecha_hasta,
        monto_min_ars,
        monto_max_ars,
        monto_min_usd,
        monto_max_usd,
        tipo_origen,
        id_origen,
        limit,
        offset = 0,
        orderBy = 'fecha',
        orderDirection = 'DESC'
      } = req.query;

      const where = {};

      // Filtros por IDs
      if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
      if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
      if (frecuencia_gasto_id) where.frecuencia_gasto_id = frecuencia_gasto_id;
      if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;
      if (tarjeta_id) where.tarjeta_id = tarjeta_id;

      // Filtros por origen
      if (tipo_origen) where.tipo_origen = tipo_origen;
      if (id_origen) where.id_origen = id_origen;

      // Filtro por rango de fechas
      if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
      }

      // Filtro por rango de montos en ARS
      if (monto_min_ars || monto_max_ars) {
        where.monto_ars = {};
        if (monto_min_ars) where.monto_ars[Op.gte] = Number(monto_min_ars);
        if (monto_max_ars) where.monto_ars[Op.lte] = Number(monto_max_ars);
      }

      // Filtro por rango de montos en USD
      if (monto_min_usd || monto_max_usd) {
        where.monto_usd = {};
        if (monto_min_usd) where.monto_usd[Op.gte] = Number(monto_min_usd);
        if (monto_max_usd) where.monto_usd[Op.lte] = Number(monto_max_usd);
      }

      const queryOptions = {
        where,
        include: this.getIncludes(),
        order: [[orderBy, orderDirection]]
      };

      if (limit) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);
        
        const gastos = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: gastos.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < gastos.count,
          hasPrev: parseInt(offset) > 0
        };
        
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
        categoria_gasto_id,
        importancia_gasto_id,
        frecuencia_gasto_id,
        tipo_pago_id,
        fecha_desde,
        fecha_hasta,
        monto_min_ars,
        monto_max_ars,
        monto_min_usd,
        monto_max_usd,
        tarjeta_id,
        tipo_origen,
        id_origen,
        limit = 100,
        offset = 0,
        orderBy = 'fecha',
        orderDirection = 'DESC'
      } = req.body;

      const where = {};

      // Filtros por IDs
      if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
      if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
      if (frecuencia_gasto_id) where.frecuencia_gasto_id = frecuencia_gasto_id;
      if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;
      if (tarjeta_id) where.tarjeta_id = tarjeta_id;

      // Filtros por origen
      if (tipo_origen) where.tipo_origen = tipo_origen;
      if (id_origen) where.id_origen = id_origen;

      // Filtro por rango de fechas
      if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
      }

      // Filtro por rango de montos en ARS
      if (monto_min_ars || monto_max_ars) {
        where.monto_ars = {};
        if (monto_min_ars) where.monto_ars[Op.gte] = Number(monto_min_ars);
        if (monto_max_ars) where.monto_ars[Op.lte] = Number(monto_max_ars);
      }

      // Filtro por rango de montos en USD
      if (monto_min_usd || monto_max_usd) {
        where.monto_usd = {};
        if (monto_min_usd) where.monto_usd[Op.gte] = Number(monto_min_usd);
        if (monto_max_usd) where.monto_usd[Op.lte] = Number(monto_max_usd);
      }

      const gastos = await this.model.findAndCountAll({
        where,
        include: this.getIncludes(),
        order: [[orderBy, orderDirection]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const pagination = {
        total: gastos.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasNext: parseInt(offset) + parseInt(limit) < gastos.count,
        hasPrev: parseInt(offset) > 0
      };

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

      // Si no se proporcionan fechas, usar el mes actual
      let whereClause = {};
      let firstDay, lastDay;
      
      if (fecha_desde && fecha_hasta) {
        whereClause = {
          fecha: {
            [Op.between]: [fecha_desde, fecha_hasta]
          }
        };
      } else {
        // Por defecto, último mes
        const now = new Date();
        firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        whereClause = {
          fecha: {
            [Op.between]: [firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
          }
        };
      }

      const gastos = await this.model.findAll({
        where: whereClause,
        include: this.getIncludes()
      });

      // Calcular totales
      const resumen = {
        periodo: {
          desde: whereClause.fecha ? whereClause.fecha[Op.between][0] : firstDay.toISOString().split('T')[0],
          hasta: whereClause.fecha ? whereClause.fecha[Op.between][1] : lastDay.toISOString().split('T')[0]
        },
        total_ars: 0,
        total_usd: 0,
        cantidad_gastos: gastos.length,
        por_categoria: {},
        por_importancia: {},
        por_tipo_pago: {}
      };

      // Agrupar por categoría
      gastos.forEach(gasto => {
        const montoArs = parseFloat(gasto.monto_ars) || 0;
        const montoUsd = parseFloat(gasto.monto_usd) || 0;
        
        // Acumular totales generales
        resumen.total_ars += montoArs;
        resumen.total_usd += montoUsd;

        // Por categoría
        const catKey = gasto.categoria?.nombre_categoria || 'Sin categoría';
        if (!resumen.por_categoria[catKey]) {
          resumen.por_categoria[catKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_categoria[catKey].total_ars += montoArs;
        resumen.por_categoria[catKey].total_usd += montoUsd;
        resumen.por_categoria[catKey].cantidad++;

        // Por importancia
        const impKey = gasto.importancia?.nombre_importancia || 'Sin importancia';
        if (!resumen.por_importancia[impKey]) {
          resumen.por_importancia[impKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_importancia[impKey].total_ars += montoArs;
        resumen.por_importancia[impKey].total_usd += montoUsd;
        resumen.por_importancia[impKey].cantidad++;

        // Por tipo de pago
        const tipoKey = gasto.tipoPago?.nombre || 'Sin tipo de pago';
        if (!resumen.por_tipo_pago[tipoKey]) {
          resumen.por_tipo_pago[tipoKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_tipo_pago[tipoKey].total_ars += montoArs;
        resumen.por_tipo_pago[tipoKey].total_usd += montoUsd;
        resumen.por_tipo_pago[tipoKey].cantidad++;
      });

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