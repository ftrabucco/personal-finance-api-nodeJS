import { BaseController } from './base.controller.js';
import { Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

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

  // Método para generar todos los gastos pendientes
  async generatePendingGastos(req, res) {
    try {
      const results = await GastoGeneratorService.generateAllPendingGastos();
      logger.info('Generación de gastos completada', { results });
      
      return res.json({
        message: 'Generación de gastos completada',
        results
      });
    } catch (error) {
      logger.error('Error en la generación de gastos:', { error });
      return res.status(500).json({
        error: 'Error al generar gastos',
        details: error.message
      });
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
        fecha_desde,
        fecha_hasta,
        monto_min_ars,
        monto_max_ars,
        monto_min_usd,
        monto_max_usd
      } = req.query;

      const where = {};

      // Filtros por IDs
      if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
      if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
      if (frecuencia_gasto_id) where.frecuencia_gasto_id = frecuencia_gasto_id;
      if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;

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

      const gastos = await this.model.findAll({
        where,
        include: this.getIncludes(),
        order: [['fecha', 'DESC']]
      });

      return res.json(gastos);
    } catch (error) {
      logger.error('Error al obtener gastos con filtros:', { error });
      return res.status(500).json({
        error: 'Error al obtener gastos',
        details: error.message
      });
    }
  }

  // Método para obtener resumen de gastos por período
  async getSummary(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;

      if (!fecha_desde || !fecha_hasta) {
        return res.status(400).json({
          error: 'Parámetros inválidos',
          details: 'Se requieren fecha_desde y fecha_hasta'
        });
      }

      const gastos = await this.model.findAll({
        where: {
          fecha: {
            [Op.between]: [fecha_desde, fecha_hasta]
          }
        },
        include: this.getIncludes()
      });

      // Calcular totales
      const resumen = {
        total_ars: gastos.reduce((sum, gasto) => sum + (gasto.monto_ars || 0), 0),
        total_usd: gastos.reduce((sum, gasto) => sum + (gasto.monto_usd || 0), 0),
        por_categoria: {},
        por_importancia: {},
        por_tipo_pago: {}
      };

      // Agrupar por categoría
      gastos.forEach(gasto => {
        // Por categoría
        const catKey = gasto.categoria?.nombre_categoria || 'Sin categoría';
        if (!resumen.por_categoria[catKey]) {
          resumen.por_categoria[catKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_categoria[catKey].total_ars += gasto.monto_ars || 0;
        resumen.por_categoria[catKey].total_usd += gasto.monto_usd || 0;
        resumen.por_categoria[catKey].cantidad++;

        // Por importancia
        const impKey = gasto.importancia?.nombre_importancia || 'Sin importancia';
        if (!resumen.por_importancia[impKey]) {
          resumen.por_importancia[impKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_importancia[impKey].total_ars += gasto.monto_ars || 0;
        resumen.por_importancia[impKey].total_usd += gasto.monto_usd || 0;
        resumen.por_importancia[impKey].cantidad++;

        // Por tipo de pago
        const tipoKey = gasto.tipoPago?.nombre || 'Sin tipo de pago';
        if (!resumen.por_tipo_pago[tipoKey]) {
          resumen.por_tipo_pago[tipoKey] = { total_ars: 0, total_usd: 0, cantidad: 0 };
        }
        resumen.por_tipo_pago[tipoKey].total_ars += gasto.monto_ars || 0;
        resumen.por_tipo_pago[tipoKey].total_usd += gasto.monto_usd || 0;
        resumen.por_tipo_pago[tipoKey].cantidad++;
      });

      return res.json(resumen);
    } catch (error) {
      logger.error('Error al obtener resumen de gastos:', { error });
      return res.status(500).json({
        error: 'Error al obtener resumen de gastos',
        details: error.message
      });
    }
  }
}

// Crear instancia del controlador
const gastoController = new GastoController();

// Exportar métodos del controlador
export const {
  getAll: obtenerTodosGastos,
  getById: obtenerGastoPorId,
  create: crearGasto,
  update: actualizarGasto,
  delete: eliminarGasto,
  getWithFilters: obtenerGastosConFiltros,
  getSummary: obtenerResumenGastos,
  generatePendingGastos: generarGastosPendientes
} = gastoController; 