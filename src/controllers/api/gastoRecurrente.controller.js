import { GastoRecurrente } from '../../models/index.js';
import logger from '../../utils/logger.js';

export const obtenerGastosRecurrentes = async (req, res) => {
  try {
    const gastosRecurrentes = await GastoRecurrente.findAll({
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta', 'frecuencia']
    });
    res.json(gastosRecurrentes);
  } catch (error) {
    logger.error('Error al obtener gastos recurrentes:', { error: error.message });
    res.status(500).json({ error: 'Error al obtener gastos recurrentes' });
  }
};

export const obtenerGastoRecurrentePorId = async (req, res) => {
  try {
    const gastoRecurrente = await GastoRecurrente.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta', 'frecuencia']
    });
    
    if (!gastoRecurrente) {
      logger.warn('Gasto recurrente no encontrado:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto recurrente no encontrado' });
    }
    
    res.json(gastoRecurrente);
  } catch (error) {
    logger.error('Error al obtener gasto recurrente:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al obtener gasto recurrente' });
  }
};

export const crearGastoRecurrente = async (req, res) => {
  try {
    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    const gastoRecurrente = await GastoRecurrente.create({
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const gastoConRelaciones = await GastoRecurrente.findByPk(gastoRecurrente.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta', 'frecuencia']
    });

    logger.info('Gasto recurrente creado:', { id: gastoRecurrente.id });
    res.status(201).json(gastoConRelaciones);
  } catch (error) {
    logger.error('Error al crear gasto recurrente:', { error: error.message });
    res.status(500).json({ error: 'Error al crear gasto recurrente' });
  }
};

export const actualizarGastoRecurrente = async (req, res) => {
  try {
    const gastoRecurrente = await GastoRecurrente.findByPk(req.params.id);
    
    if (!gastoRecurrente) {
      logger.warn('Gasto recurrente no encontrado para actualizar:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto recurrente no encontrado' });
    }

    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    await gastoRecurrente.update({
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const gastoActualizado = await GastoRecurrente.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta', 'frecuencia']
    });

    logger.info('Gasto recurrente actualizado:', { id: req.params.id });
    res.json(gastoActualizado);
  } catch (error) {
    logger.error('Error al actualizar gasto recurrente:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al actualizar gasto recurrente' });
  }
};

export const eliminarGastoRecurrente = async (req, res) => {
  try {
    const gastoRecurrente = await GastoRecurrente.findByPk(req.params.id);
    
    if (!gastoRecurrente) {
      logger.warn('Gasto recurrente no encontrado para eliminar:', { id: req.params.id });
      return res.status(404).json({ error: 'Gasto recurrente no encontrado' });
    }

    await gastoRecurrente.destroy();
    logger.info('Gasto recurrente eliminado:', { id: req.params.id });
    res.json({ message: 'Gasto recurrente eliminado correctamente' });
  } catch (error) {
    logger.error('Error al eliminar gasto recurrente:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al eliminar gasto recurrente' });
  }
};
