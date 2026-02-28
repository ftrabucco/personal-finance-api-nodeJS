import { FuenteIngreso, IngresoUnico, IngresoRecurrente } from '../../models/index.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Controller for managing user income sources (fuentes de ingreso)
 * - System sources (usuario_id = NULL) are shared by all users, cannot be deleted
 * - User sources (usuario_id = X) are private to that user, can be created/deleted
 * - All users can hide/show sources (activo field) for their preference
 */

// GET /api/fuentes-ingreso - Get all income sources for current user (system + user's own)
export const obtenerFuentesIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { includeInactive } = req.query;

    const whereClause = {
      [Op.or]: [
        { usuario_id: null },          // System sources
        { usuario_id: usuarioId }      // User's own sources
      ]
    };

    // By default, only return active sources unless specifically requested
    if (includeInactive !== 'true') {
      whereClause.activo = true;
    }

    const fuentes = await FuenteIngreso.findAll({
      where: whereClause,
      order: [
        ['orden', 'ASC'],
        ['nombre', 'ASC']
      ]
    });

    // Add metadata to indicate if source is system or user-owned
    const fuentesConMetadata = fuentes.map(fuente => ({
      ...fuente.toJSON(),
      es_sistema: fuente.usuario_id === null,
      puede_eliminar: fuente.usuario_id === usuarioId
    }));

    return sendSuccess(res, fuentesConMetadata);
  } catch (error) {
    logger.error('Error al obtener fuentes de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuentes de ingreso', error.message);
  }
};

// GET /api/fuentes-ingreso/:id - Get income source by ID
export const obtenerFuenteIngresoPorId = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const fuenteId = req.params.id;

    const fuente = await FuenteIngreso.findOne({
      where: {
        id: fuenteId,
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    return sendSuccess(res, {
      ...fuente.toJSON(),
      es_sistema: fuente.usuario_id === null,
      puede_eliminar: fuente.usuario_id === usuarioId
    });
  } catch (error) {
    logger.error('Error al obtener fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuente de ingreso', error.message);
  }
};

// POST /api/fuentes-ingreso - Create a new user income source
export const crearFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombre, icono, orden } = req.body;

    if (!nombre || nombre.trim() === '') {
      return sendValidationError(res, ['El nombre de la fuente de ingreso es requerido']);
    }

    // Check if source with same name already exists for this user or system
    const existing = await FuenteIngreso.findOne({
      where: {
        nombre: nombre.trim(),
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (existing) {
      return sendValidationError(res, ['Ya existe una fuente de ingreso con ese nombre']);
    }

    const fuente = await FuenteIngreso.create({
      nombre: nombre.trim(),
      usuario_id: usuarioId,
      icono: icono || null,
      orden: orden || 0,
      activo: true
    });

    logger.info('Fuente de ingreso creada:', { id: fuente.id, usuario_id: usuarioId });

    return sendSuccess(res, {
      ...fuente.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    }, 201);
  } catch (error) {
    logger.error('Error al crear fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al crear fuente de ingreso', error.message);
  }
};

// PUT /api/fuentes-ingreso/:id - Update an income source
export const actualizarFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const fuenteId = req.params.id;
    const { nombre, icono, orden, activo } = req.body;

    const fuente = await FuenteIngreso.findOne({
      where: {
        id: fuenteId,
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!fuente) {
      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    const esFuenteSistema = fuente.usuario_id === null;

    // System sources: only allow updating activo, orden, icono (not nombre)
    if (esFuenteSistema) {
      return sendError(res, 403, 'Las fuentes de ingreso del sistema no pueden ser modificadas directamente');
    }

    // User sources: can update everything
    const updateData = {};
    if (nombre && nombre.trim() !== '') {
      // Check if new name conflicts
      const existing = await FuenteIngreso.findOne({
        where: {
          id: { [Op.ne]: fuenteId },
          nombre: nombre.trim(),
          [Op.or]: [
            { usuario_id: null },
            { usuario_id: usuarioId }
          ]
        }
      });

      if (existing) {
        return sendValidationError(res, ['Ya existe una fuente de ingreso con ese nombre']);
      }
      updateData.nombre = nombre.trim();
    }
    if (icono !== undefined) updateData.icono = icono;
    if (typeof orden === 'number') updateData.orden = orden;
    if (typeof activo === 'boolean') updateData.activo = activo;

    await fuente.update(updateData);
    logger.info('Fuente de ingreso actualizada:', { id: fuente.id });

    return sendSuccess(res, {
      ...fuente.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    });
  } catch (error) {
    logger.error('Error al actualizar fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al actualizar fuente de ingreso', error.message);
  }
};

// DELETE /api/fuentes-ingreso/:id - Delete a user income source
export const eliminarFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const fuenteId = req.params.id;

    const fuente = await FuenteIngreso.findOne({
      where: {
        id: fuenteId,
        usuario_id: usuarioId // Can only delete own sources
      }
    });

    if (!fuente) {
      // Check if it's a system source
      const sistemaFuente = await FuenteIngreso.findOne({
        where: { id: fuenteId, usuario_id: null }
      });

      if (sistemaFuente) {
        return sendError(res, 403, 'Las fuentes de ingreso del sistema no pueden ser eliminadas');
      }

      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    // Check if source is being used in any income
    const [ingresosUnicosCount, ingresosRecurrentesCount] = await Promise.all([
      IngresoUnico.count({ where: { fuente_ingreso_id: fuenteId, usuario_id: usuarioId } }),
      IngresoRecurrente.count({ where: { fuente_ingreso_id: fuenteId, usuario_id: usuarioId } })
    ]);

    const totalUsos = ingresosUnicosCount + ingresosRecurrentesCount;

    if (totalUsos > 0) {
      return sendError(res, 400, `No se puede eliminar la fuente porque está siendo usada en ${totalUsos} ingreso(s). Desactívala en su lugar.`);
    }

    await fuente.destroy();
    logger.info('Fuente de ingreso eliminada:', { id: fuenteId, usuario_id: usuarioId });

    return sendSuccess(res, { message: 'Fuente de ingreso eliminada correctamente' });
  } catch (error) {
    logger.error('Error al eliminar fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al eliminar fuente de ingreso', error.message);
  }
};

// PATCH /api/fuentes-ingreso/:id/toggle-activo - Toggle active state
export const toggleActivoFuenteIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const fuenteId = req.params.id;

    const fuente = await FuenteIngreso.findOne({
      where: {
        id: fuenteId,
        usuario_id: usuarioId
      }
    });

    if (!fuente) {
      const sistemaFuente = await FuenteIngreso.findOne({
        where: { id: fuenteId, usuario_id: null }
      });

      if (sistemaFuente) {
        return sendError(res, 403, 'Las preferencias de fuentes del sistema no están disponibles aún');
      }

      return sendError(res, 404, 'Fuente de ingreso no encontrada');
    }

    await fuente.update({ activo: !fuente.activo });
    logger.info('Fuente de ingreso activo toggled:', { id: fuenteId, activo: fuente.activo });

    return sendSuccess(res, {
      ...fuente.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    });
  } catch (error) {
    logger.error('Error al cambiar estado de fuente de ingreso:', { error });
    return sendError(res, 500, 'Error al cambiar estado de fuente de ingreso', error.message);
  }
};

// PUT /api/fuentes-ingreso/reorder - Reorder income sources
export const reordenarFuentesIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { orden } = req.body; // Array of { id, orden }

    if (!Array.isArray(orden)) {
      return sendValidationError(res, ['Se requiere un array de fuentes de ingreso con su orden']);
    }

    // Only allow reordering user's own sources for now
    const updates = orden.map(async ({ id, orden: nuevoOrden }) => {
      await FuenteIngreso.update(
        { orden: nuevoOrden },
        { where: { id, usuario_id: usuarioId } }
      );
    });

    await Promise.all(updates);
    logger.info('Fuentes de ingreso reordenadas:', { usuario_id: usuarioId, count: orden.length });

    return sendSuccess(res, { message: 'Fuentes de ingreso reordenadas correctamente' });
  } catch (error) {
    logger.error('Error al reordenar fuentes de ingreso:', { error });
    return sendError(res, 500, 'Error al reordenar fuentes de ingreso', error.message);
  }
};
