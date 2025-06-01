import { Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

export const generateGastos = async (req, res) => {
  try {
    const results = await GastoGeneratorService.generateAllPendingGastos();
    res.json({
      message: 'Generación de gastos completada',
      results
    });
  } catch (error) {
    logger.error('Error en el endpoint de generación de gastos:', { error });
    res.status(500).json({
      error: 'Error al generar gastos',
      details: error.message
    });
  }
};

export const getGastos = async (req, res) => {
  try {
    const {
      tipo_origen,
      categoria_id,
      importancia_id,
      tipo_pago_id,
      fecha_desde,
      fecha_hasta
    } = req.query;

    // Construir el objeto de filtros
    const where = {};
    
    if (tipo_origen) {
      where.tipo_origen = tipo_origen;
    }
    
    if (categoria_id) {
      where.categoria_gasto_id = categoria_id;
    }
    
    if (importancia_id) {
      where.importancia_gasto_id = importancia_id;
    }
    
    if (tipo_pago_id) {
      where.tipo_pago_id = tipo_pago_id;
    }
    
    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) {
        where.fecha[Op.gte] = fecha_desde;
      }
      if (fecha_hasta) {
        where.fecha[Op.lte] = fecha_hasta;
      }
    }

    const gastos = await Gasto.findAll({
      where,
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      order: [['fecha', 'DESC']]
    });

    res.json(gastos);
  } catch (error) {
    logger.error('Error al obtener gastos:', { error });
    res.status(500).json({
      error: 'Error al obtener gastos',
      details: error.message
    });
  }
}; 