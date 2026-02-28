import { CategoriaGasto, Gasto, GastoUnico, GastoRecurrente, DebitoAutomatico, Compra } from '../../models/index.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Controller for managing user categories
 * - System categories (usuario_id = NULL) are shared by all users, cannot be deleted
 * - User categories (usuario_id = X) are private to that user, can be created/deleted
 * - All users can hide/show categories (activo field) for their preference
 */

// GET /api/categorias - Get all categories for current user (system + user's own)
export const obtenerCategorias = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { includeInactive } = req.query;

    const whereClause = {
      [Op.or]: [
        { usuario_id: null },          // System categories
        { usuario_id: usuarioId }      // User's own categories
      ]
    };

    // By default, only return active categories unless specifically requested
    if (includeInactive !== 'true') {
      whereClause.activo = true;
    }

    const categorias = await CategoriaGasto.findAll({
      where: whereClause,
      order: [
        ['orden', 'ASC'],
        ['nombre_categoria', 'ASC']
      ]
    });

    // Add metadata to indicate if category is system or user-owned
    const categoriasConMetadata = categorias.map(cat => ({
      ...cat.toJSON(),
      es_sistema: cat.usuario_id === null,
      puede_eliminar: cat.usuario_id === usuarioId
    }));

    return sendSuccess(res, categoriasConMetadata);
  } catch (error) {
    logger.error('Error al obtener categorías:', { error });
    return sendError(res, 500, 'Error al obtener categorías', error.message);
  }
};

// GET /api/categorias/:id - Get category by ID
export const obtenerCategoriaPorId = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const categoriaId = req.params.id;

    const categoria = await CategoriaGasto.findOne({
      where: {
        id: categoriaId,
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    return sendSuccess(res, {
      ...categoria.toJSON(),
      es_sistema: categoria.usuario_id === null,
      puede_eliminar: categoria.usuario_id === usuarioId
    });
  } catch (error) {
    logger.error('Error al obtener categoría:', { error });
    return sendError(res, 500, 'Error al obtener categoría', error.message);
  }
};

// POST /api/categorias - Create a new user category
export const crearCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombre_categoria, icono, orden } = req.body;

    if (!nombre_categoria || nombre_categoria.trim() === '') {
      return sendValidationError(res, ['El nombre de la categoría es requerido']);
    }

    // Check if category with same name already exists for this user or system
    const existing = await CategoriaGasto.findOne({
      where: {
        nombre_categoria: nombre_categoria.trim(),
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (existing) {
      return sendValidationError(res, ['Ya existe una categoría con ese nombre']);
    }

    const categoria = await CategoriaGasto.create({
      nombre_categoria: nombre_categoria.trim(),
      usuario_id: usuarioId,
      icono: icono || null,
      orden: orden || 0,
      activo: true
    });

    logger.info('Categoría creada:', { id: categoria.id, usuario_id: usuarioId });

    return sendSuccess(res, {
      ...categoria.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    }, 201);
  } catch (error) {
    logger.error('Error al crear categoría:', { error });
    return sendError(res, 500, 'Error al crear categoría', error.message);
  }
};

// PUT /api/categorias/:id - Update a category
export const actualizarCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const categoriaId = req.params.id;
    const { nombre_categoria, icono, orden, activo } = req.body;

    const categoria = await CategoriaGasto.findOne({
      where: {
        id: categoriaId,
        [Op.or]: [
          { usuario_id: null },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    const esCategoriaSistema = categoria.usuario_id === null;

    // System categories: only allow updating activo, orden, icono (not nombre)
    if (esCategoriaSistema) {
      const updateData = {};
      if (typeof activo === 'boolean') updateData.activo = activo;
      if (typeof orden === 'number') updateData.orden = orden;
      if (icono !== undefined) updateData.icono = icono;

      // Note: For system categories, we need a per-user preference table
      // For now, we'll just return a message that system categories can't be modified
      // In a future iteration, we could create a user_categoria_preferences table
      return sendError(res, 403, 'Las categorías del sistema no pueden ser modificadas directamente');
    }

    // User categories: can update everything
    const updateData = {};
    if (nombre_categoria && nombre_categoria.trim() !== '') {
      // Check if new name conflicts
      const existing = await CategoriaGasto.findOne({
        where: {
          id: { [Op.ne]: categoriaId },
          nombre_categoria: nombre_categoria.trim(),
          [Op.or]: [
            { usuario_id: null },
            { usuario_id: usuarioId }
          ]
        }
      });

      if (existing) {
        return sendValidationError(res, ['Ya existe una categoría con ese nombre']);
      }
      updateData.nombre_categoria = nombre_categoria.trim();
    }
    if (icono !== undefined) updateData.icono = icono;
    if (typeof orden === 'number') updateData.orden = orden;
    if (typeof activo === 'boolean') updateData.activo = activo;

    await categoria.update(updateData);
    logger.info('Categoría actualizada:', { id: categoria.id });

    return sendSuccess(res, {
      ...categoria.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    });
  } catch (error) {
    logger.error('Error al actualizar categoría:', { error });
    return sendError(res, 500, 'Error al actualizar categoría', error.message);
  }
};

// DELETE /api/categorias/:id - Delete a user category
export const eliminarCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const categoriaId = req.params.id;

    const categoria = await CategoriaGasto.findOne({
      where: {
        id: categoriaId,
        usuario_id: usuarioId // Can only delete own categories
      }
    });

    if (!categoria) {
      // Check if it's a system category
      const sistemaCategoria = await CategoriaGasto.findOne({
        where: { id: categoriaId, usuario_id: null }
      });

      if (sistemaCategoria) {
        return sendError(res, 403, 'Las categorías del sistema no pueden ser eliminadas');
      }

      return sendError(res, 404, 'Categoría no encontrada');
    }

    // Check if category is being used in any expense
    const [gastosCount, gastosUnicosCount, gastosRecurrentesCount, debitosCount, comprasCount] = await Promise.all([
      Gasto.count({ where: { categoria_gasto_id: categoriaId, usuario_id: usuarioId } }),
      GastoUnico.count({ where: { categoria_gasto_id: categoriaId, usuario_id: usuarioId } }),
      GastoRecurrente.count({ where: { categoria_gasto_id: categoriaId, usuario_id: usuarioId } }),
      DebitoAutomatico.count({ where: { categoria_gasto_id: categoriaId, usuario_id: usuarioId } }),
      Compra.count({ where: { categoria_gasto_id: categoriaId, usuario_id: usuarioId } })
    ]);

    const totalUsos = gastosCount + gastosUnicosCount + gastosRecurrentesCount + debitosCount + comprasCount;

    if (totalUsos > 0) {
      return sendError(res, 400, `No se puede eliminar la categoría porque está siendo usada en ${totalUsos} gasto(s). Desactívala en su lugar.`);
    }

    await categoria.destroy();
    logger.info('Categoría eliminada:', { id: categoriaId, usuario_id: usuarioId });

    return sendSuccess(res, { message: 'Categoría eliminada correctamente' });
  } catch (error) {
    logger.error('Error al eliminar categoría:', { error });
    return sendError(res, 500, 'Error al eliminar categoría', error.message);
  }
};

// PATCH /api/categorias/:id/toggle-activo - Toggle active state
export const toggleActivoCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const categoriaId = req.params.id;

    // For now, we only allow toggling user's own categories
    // System category preferences would need a separate table
    const categoria = await CategoriaGasto.findOne({
      where: {
        id: categoriaId,
        usuario_id: usuarioId
      }
    });

    if (!categoria) {
      const sistemaCategoria = await CategoriaGasto.findOne({
        where: { id: categoriaId, usuario_id: null }
      });

      if (sistemaCategoria) {
        return sendError(res, 403, 'Las preferencias de categorías del sistema no están disponibles aún');
      }

      return sendError(res, 404, 'Categoría no encontrada');
    }

    await categoria.update({ activo: !categoria.activo });
    logger.info('Categoría activo toggled:', { id: categoriaId, activo: categoria.activo });

    return sendSuccess(res, {
      ...categoria.toJSON(),
      es_sistema: false,
      puede_eliminar: true
    });
  } catch (error) {
    logger.error('Error al cambiar estado de categoría:', { error });
    return sendError(res, 500, 'Error al cambiar estado de categoría', error.message);
  }
};

// PUT /api/categorias/reorder - Reorder categories
export const reordenarCategorias = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { orden } = req.body; // Array of { id, orden }

    if (!Array.isArray(orden)) {
      return sendValidationError(res, ['Se requiere un array de categorías con su orden']);
    }

    // Only allow reordering user's own categories for now
    const updates = orden.map(async ({ id, orden: nuevoOrden }) => {
      await CategoriaGasto.update(
        { orden: nuevoOrden },
        { where: { id, usuario_id: usuarioId } }
      );
    });

    await Promise.all(updates);
    logger.info('Categorías reordenadas:', { usuario_id: usuarioId, count: orden.length });

    return sendSuccess(res, { message: 'Categorías reordenadas correctamente' });
  } catch (error) {
    logger.error('Error al reordenar categorías:', { error });
    return sendError(res, 500, 'Error al reordenar categorías', error.message);
  }
};
