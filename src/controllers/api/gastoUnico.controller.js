import { GastoUnico } from '../../models/index.js';
import logger from '../../utils/logger.js';

export const obtenerGastosUnicos = async (req, res) => {
  try {
    const gastosUnicos = await GastoUnico.findAll({
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });
    res.json(gastosUnicos);
  } catch (error) {
    logger.error('Error al obtener gastos únicos:', { error: error.message });
    res.status(500).json({ error: 'Error al obtener gastos únicos' });
  }
};

export const obtenerGastoUnicoPorId = async (req, res) => {
  try {
    const gastoUnico = await GastoUnico.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });
    
    if (!gastoUnico) {
      logger.warn('Gasto único no encontrado:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto único no encontrado' });
    }
    
    res.json(gastoUnico);
  } catch (error) {
    logger.error('Error al obtener gasto único:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al obtener gasto único' });
  }
};

export const crearGastoUnico = async (req, res) => {
  try {
    const {
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    const gastoUnico = await GastoUnico.create({
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const gastoConRelaciones = await GastoUnico.findByPk(gastoUnico.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });

    logger.info('Gasto único creado:', { id: gastoUnico.id });
    res.status(201).json(gastoConRelaciones);
  } catch (error) {
    logger.error('Error al crear gasto único:', { error: error.message });
    res.status(500).json({ error: 'Error al crear gasto único' });
  }
};

export const actualizarGastoUnico = async (req, res) => {
  try {
    const gastoUnico = await GastoUnico.findByPk(req.params.id);
    
    if (!gastoUnico) {
      logger.warn('Gasto único no encontrado para actualizar:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto único no encontrado' });
    }

    const {
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    await gastoUnico.update({
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const gastoActualizado = await GastoUnico.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });

    logger.info('Gasto único actualizado:', { id: req.params.id });
    res.json(gastoActualizado);
  } catch (error) {
    logger.error('Error al actualizar gasto único:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al actualizar gasto único' });
  }
};

export const eliminarGastoUnico = async (req, res) => {
  try {
    const gastoUnico = await GastoUnico.findByPk(req.params.id);
    
    if (!gastoUnico) {
      logger.warn('Gasto único no encontrado para eliminar:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto único no encontrado' });
    }

    await gastoUnico.destroy();
    logger.info('Gasto único eliminado:', { id: req.params.id });
    res.json({ message: 'Gasto único eliminado correctamente' });
  } catch (error) {
    logger.error('Error al eliminar gasto único:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al eliminar gasto único' });
  }
};
