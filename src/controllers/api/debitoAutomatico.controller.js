import { DebitoAutomatico } from '../../models/index.js';
import logger from '../../utils/logger.js';

export const obtenerDebitosAutomaticos = async (req, res) => {
  try {
    const debitosAutomaticos = await DebitoAutomatico.findAll({
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });
    res.json(debitosAutomaticos);
  } catch (error) {
    logger.error('Error al obtener débitos automáticos:', { error: error.message });
    res.status(500).json({ error: 'Error al obtener débitos automáticos' });
  }
};

export const obtenerDebitoAutomaticoPorId = async (req, res) => {
  try {
    const debitoAutomatico = await DebitoAutomatico.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });
    
    if (!debitoAutomatico) {
      logger.warn('Débito automático no encontrado:', { id: req.params.id });
      return res.status(404).json({ error: 'Débito automático no encontrado' });
    }
    
    res.json(debitoAutomatico);
  } catch (error) {
    logger.error('Error al obtener débito automático:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al obtener débito automático' });
  }
};

export const crearDebitoAutomatico = async (req, res) => {
  try {
    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    const debitoAutomatico = await DebitoAutomatico.create({
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const debitoConRelaciones = await DebitoAutomatico.findByPk(debitoAutomatico.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });

    logger.info('Débito automático creado:', { id: debitoAutomatico.id });
    res.status(201).json(debitoConRelaciones);
  } catch (error) {
    logger.error('Error al crear débito automático:', { error: error.message });
    res.status(500).json({ error: 'Error al crear débito automático' });
  }
};

export const actualizarDebitoAutomatico = async (req, res) => {
  try {
    const debitoAutomatico = await DebitoAutomatico.findByPk(req.params.id);
    
    if (!debitoAutomatico) {
      logger.warn('Débito automático no encontrado para actualizar:', { id: req.params.id });
      return res.status(404).json({ error: 'Débito automático no encontrado' });
    }

    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    await debitoAutomatico.update({
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    const debitoActualizado = await DebitoAutomatico.findByPk(req.params.id, {
      include: ['categoria', 'importancia', 'tipoPago', 'tarjeta']
    });

    logger.info('Débito automático actualizado:', { id: req.params.id });
    res.json(debitoActualizado);
  } catch (error) {
    logger.error('Error al actualizar débito automático:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al actualizar débito automático' });
  }
};

export const eliminarDebitoAutomatico = async (req, res) => {
  try {
    const debitoAutomatico = await DebitoAutomatico.findByPk(req.params.id);
    
    if (!debitoAutomatico) {
      logger.warn('Débito automático no encontrado para eliminar:', { id: req.params.id });
      return res.status(404).json({ error: 'Débito automático no encontrado' });
    }

    await debitoAutomatico.destroy();
    logger.info('Débito automático eliminado:', { id: req.params.id });
    res.json({ message: 'Débito automático eliminado correctamente' });
  } catch (error) {
    logger.error('Error al eliminar débito automático:', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Error al eliminar débito automático' });
  }
};
