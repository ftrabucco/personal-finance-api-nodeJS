import { FuenteIngreso, IngresoUnico, IngresoRecurrente } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Controller for user-customizable income sources
 * Users can create, edit, and delete their own income sources
 * System sources (es_sistema=true) are read-only
 */

// GET /api/fuentes-ingreso - Get all income sources for user (system + personal)
export const obtenerFuentesIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { includeInactive } = req.query;

    const whereClause = {
      [Op.or]: [
        { es_sistema: true },
        { usuario_id: usuarioId }
      ]
    };

    // By default, only show active sources
    if (includeInactive !== 'true') {
      whereClause.activo = true;
    }

    const fuentes = await FuenteIngreso.findAll({
      where: whereClause,
      order: [
        ['es_sistema', 'DESC'], // System sources first
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return sendSuccess(res, fuentes);
  } catch (error) {
    logger.error('Error al obtener fuentes de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuentes de ingreso', error.message);
  }
};

// GET /api/fuentes-ingreso/:id - Get source by ID
export const obtenerFuenteIngresoPorId = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const fuente = await FuenteIngreso.findOne({
      where: {
        id,
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    return sendSuccess(res, fuente);
  } catch (error) {
    logger.error('Error al obtener fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuente de ingreso', error.message);
  }
};

// POST /api/fuentes-ingreso - Create a new personal income source
export const crearFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombre, icono, orden } = req.body;

    if (!nombre || nombre.trim() === '') {
      return sendError(res, 400, 'El nombre de la fuente es requerido');
    }

    // Check if source already exists for this user
    const existente = await FuenteIngreso.findOne({
      where: {
        nombre: nombre.trim(),
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (existente) {
      return sendError(res, 400, 'Ya existe una fuente de ingreso con ese nombre');
    }

    // Get next orden if not provided
    let ordenFinal = orden;
    if (ordenFinal === undefined) {
      const maxOrden = await FuenteIngreso.max('orden', {
        where: { usuario_id: usuarioId }
      });
      ordenFinal = (maxOrden || 0) + 1;
    }

    const fuente = await FuenteIngreso.create({
      nombre: nombre.trim(),
      icono: icono || '💰',
      usuario_id: usuarioId,
      es_sistema: false,
      activo: true,
      orden: ordenFinal
    });

    return sendSuccess(res, fuente, 201);
  } catch (error) {
    logger.error('Error al crear fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al crear fuente de ingreso', error.message);
  }
};

// PUT /api/fuentes-ingreso/:id - Update a personal income source
export const actualizarFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;
    const { nombre, icono, orden, activo } = req.body;

    const fuente = await FuenteIngreso.findByPk(id);

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    // Can't edit system sources
    if (fuente.es_sistema) {
      return sendError(res, 403, 'No se pueden modificar fuentes del sistema');
    }

    // Can only edit own sources
    if (fuente.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para modificar esta fuente');
    }

    // Check for duplicate name if changing it
    if (nombre && nombre.trim() !== fuente.nombre) {
      const existente = await FuenteIngreso.findOne({
        where: {
          nombre: nombre.trim(),
          id: { [Op.ne]: id },
          [Op.or]: [
            { es_sistema: true },
            { usuario_id: usuarioId }
          ]
        }
      });

      if (existente) {
        return sendError(res, 400, 'Ya existe una fuente de ingreso con ese nombre');
      }
    }

    await fuente.update({
      nombre: nombre?.trim() ?? fuente.nombre,
      icono: icono ?? fuente.icono,
      orden: orden ?? fuente.orden,
      activo: activo ?? fuente.activo
    });

    return sendSuccess(res, fuente);
  } catch (error) {
    logger.error('Error al actualizar fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al actualizar fuente de ingreso', error.message);
  }
};

// PATCH /api/fuentes-ingreso/:id/toggle-activo - Toggle active status
export const toggleActivo = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const fuente = await FuenteIngreso.findByPk(id);

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    // Can't toggle system sources
    if (fuente.es_sistema) {
      return sendError(res, 403, 'No se pueden modificar fuentes del sistema');
    }

    // Can only toggle own sources
    if (fuente.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para modificar esta fuente');
    }

    await fuente.update({ activo: !fuente.activo });

    return sendSuccess(res, fuente);
  } catch (error) {
    logger.error('Error al cambiar estado de fuente:', { error });
    return sendError(res, 500, 'Error al cambiar estado de fuente', error.message);
  }
};

// DELETE /api/fuentes-ingreso/:id - Delete a personal source (only if not in use)
export const eliminarFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const fuente = await FuenteIngreso.findByPk(id);

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    // Can't delete system sources
    if (fuente.es_sistema) {
      return sendError(res, 403, 'No se pueden eliminar fuentes del sistema');
    }

    // Can only delete own sources
    if (fuente.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para eliminar esta fuente');
    }

    // Check if source is in use
    const [ingresosUnicos, ingresosRecurrentes] = await Promise.all([
      IngresoUnico.count({ where: { fuente_id: id, usuario_id: usuarioId } }),
      IngresoRecurrente.count({ where: { fuente_id: id, usuario_id: usuarioId } })
    ]);

    const totalUsos = ingresosUnicos + ingresosRecurrentes;

    if (totalUsos > 0) {
      return sendError(res, 400, `No se puede eliminar la fuente porque está siendo usada en ${totalUsos} registro(s). Desactívala en su lugar.`);
    }

    await fuente.destroy();

    return sendSuccess(res, { message: 'Fuente de ingreso eliminada correctamente' });
  } catch (error) {
    logger.error('Error al eliminar fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al eliminar fuente de ingreso', error.message);
  }
};
