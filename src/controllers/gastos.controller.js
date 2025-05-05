import { Gasto, TipoPago, CategoriaGasto, FrecuenciaGasto, ImportanciaGasto, sequelize } from '../models/index.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';
export const crearGasto = async (req, res, next) => {
  try {
    logger.info('Creando nuevo gasto');
    // Desestructurar el cuerpo de la solicitud
    const { fecha, monto_ars, monto_usd, descripcion, tipo_pago_id, categoria_gasto_id, frecuencia_gasto_id, importancia_gasto_id } = req.body;

    // Crear el nuevo Gasto en la base de datos
    const nuevoGasto = await Gasto.create({
      fecha,
      monto_ars,
      monto_usd: monto_usd || (monto_ars / 1000), // Si no se pasa monto_usd, lo calculamos (esto es solo un ejemplo, necesitarías lógica real de conversión de divisas)
      descripcion,
      tipo_pago_id,
      categoria_gasto_id,
      frecuencia_gasto_id,
      importancia_gasto_id,
    });

    return res.status(201).json(nuevoGasto);

  } catch (error) {
    next(error)
  }
};

// Obtener todos los gastos
export const obtenerTodosGastos = async (req, res) => {
  try {
    const gastos = await Gasto.findAll({

      include: [
        { model: TipoPago, attributes: ['nombre'] },
        { model: CategoriaGasto, attributes: ['nombre_categoria'] },
        { model: FrecuenciaGasto, attributes: ['nombre_frecuencia'] },
        { model: ImportanciaGasto, attributes: ['nombre_importancia'] }
      ]
    });
    return res.status(200).json(gastos);
  } catch (error) {
    console.error('Error al obtener los gastos:', error);
    return res.status(500).json({ error: 'Hubo un error al obtener los gastos' });
  }
};

export async function obtenerGastos(req, res, next) {
  try {
    const { categoria_gasto_id, importancia_gasto_id, tipo_pago_id, min, max } = req.query;

    const where = {};

    if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
    if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
    if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;
    if (min) where.monto_ars = { ...(where.monto_ars || {}), [Op.gte]: Number(min) };
    if (max) where.monto_ars = { ...(where.monto_ars || {}), [Op.lte]: Number(max) };

    const gastos = await Gasto.findAll({ where });
    res.json({ status: 'ok', data: gastos });
  } catch (err) {
    next(err);
  }
}
// Obtener un solo gasto por ID
const obtenerGastoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const gasto = await Gasto.findByPk(id, {
      include: [
        { model: TipoPago, attributes: ['nombre'] },
        { model: CategoriaGasto, attributes: ['nombre_categoria'] },
        { model: FrecuenciaGasto, attributes: ['nombre_frecuencia'] },
        { model: ImportanciaGasto, attributes: ['nombre_importancia'] }
      ]
    });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    return res.status(200).json(gasto);
  } catch (error) {
    console.error('Error al obtener el gasto:', error);
    return res.status(500).json({ error: 'Hubo un error al obtener el gasto' });
  }
};

// Actualizar un gasto
const actualizarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const gastoExistente = await Gasto.findByPk(id);

    if (!gastoExistente) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const { fecha, monto_ars, monto_usd, descripcion, tipo_pago_id, categoria_gasto_id, frecuencia_gasto_id, importancia_gasto_id } = req.body;

    const gastoActualizado = await gastoExistente.update({
      fecha,
      monto_ars,
      monto_usd: monto_usd || (monto_ars / 100),  // Conversion si es necesario
      descripcion,
      tipo_pago_id,
      categoria_gasto_id,
      frecuencia_gasto_id,
      importancia_gasto_id,
    });

    return res.status(200).json(gastoActualizado);
  } catch (error) {
    console.error('Error al actualizar el gasto:', error);
    return res.status(500).json({ error: 'Hubo un error al actualizar el gasto' });
  }
};

// Eliminar un gasto
const eliminarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const gasto = await Gasto.findByPk(id);

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    await gasto.destroy();
    return res.status(204).json();
  } catch (error) {
    console.error('Error al eliminar el gasto:', error);
    return res.status(500).json({ error: 'Hubo un error al eliminar el gasto' });
  }
};

export default {
  crearGasto,
  obtenerTodosGastos,
  obtenerGastos,
  obtenerGastoPorId,
  actualizarGasto,
  eliminarGasto
};



/*
export const crearGasto = async (req, res) => {
    try {
        const { error, value } = gastoSchema.validate(req.body);
        if (error) {
            return res.status(422).json({ error: error.details[0].message });
        }
        const { fecha, monto_ars, descripcion, categoria } = value;
        const nuevoGasto = await Gasto.create({ fecha, monto_ars, descripcion, categoria });
        res.status(201).json(nuevoGasto);
        //message: "welcome to gastos API"
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear el gasto', detalle: error.message });
    }
};

export const obtenerGastos = async (req, res) => {
    try {
        const gastos = await Gasto.findAll();
        res.json(gastos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los gastos', detalle: error.message });
    }
};
*/