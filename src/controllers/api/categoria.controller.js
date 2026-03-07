import { CategoriaGasto, Gasto, GastoUnico, GastoRecurrente, DebitoAutomatico, Compra } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Controller for user-customizable categories
 * Users can create, edit, and delete their own categories
 * System categories (es_sistema=true) are read-only
 */

// GET /api/categorias - Get all categories for user (system + personal)
export const obtenerCategorias = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { includeInactive } = req.query;

    const whereClause = {
      [Op.or]: [
        { es_sistema: true },
        { usuario_id: usuarioId }
      ]
    };

    // By default, only show active categories
    if (includeInactive !== 'true') {
      whereClause.activo = true;
    }

    const categorias = await CategoriaGasto.findAll({
      where: whereClause,
      order: [
        ['es_sistema', 'DESC'], // System categories first
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return sendSuccess(res, categorias);
  } catch (error) {
    logger.error('Error al obtener categorías:', { error });
    return sendError(res, 500, 'Error al obtener categorías', error.message);
  }
};

// GET /api/categorias/:id - Get category by ID
export const obtenerCategoriaPorId = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const categoria = await CategoriaGasto.findOne({
      where: {
        id,
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    return sendSuccess(res, categoria);
  } catch (error) {
    logger.error('Error al obtener categoría:', { error });
    return sendError(res, 500, 'Error al obtener categoría', error.message);
  }
};

// POST /api/categorias - Create a new personal category
export const crearCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombre_categoria, icono, orden } = req.body;

    if (!nombre_categoria || nombre_categoria.trim() === '') {
      return sendError(res, 400, 'El nombre de la categoría es requerido');
    }

    // Check if category already exists for this user
    const existente = await CategoriaGasto.findOne({
      where: {
        nombre_categoria: nombre_categoria.trim(),
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId }
        ]
      }
    });

    if (existente) {
      return sendError(res, 400, 'Ya existe una categoría con ese nombre');
    }

    // Get next orden if not provided
    let ordenFinal = orden;
    if (ordenFinal === undefined) {
      const maxOrden = await CategoriaGasto.max('orden', {
        where: { usuario_id: usuarioId }
      });
      ordenFinal = (maxOrden || 0) + 1;
    }

    const categoria = await CategoriaGasto.create({
      nombre_categoria: nombre_categoria.trim(),
      icono: icono || '📦',
      usuario_id: usuarioId,
      es_sistema: false,
      activo: true,
      orden: ordenFinal
    });

    return sendSuccess(res, categoria, 201);
  } catch (error) {
    logger.error('Error al crear categoría:', { error });
    return sendError(res, 500, 'Error al crear categoría', error.message);
  }
};

// PUT /api/categorias/:id - Update a personal category
export const actualizarCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;
    const { nombre_categoria, icono, orden, activo } = req.body;

    const categoria = await CategoriaGasto.findByPk(id);

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    // Can't edit system categories
    if (categoria.es_sistema) {
      return sendError(res, 403, 'No se pueden modificar categorías del sistema');
    }

    // Can only edit own categories
    if (categoria.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para modificar esta categoría');
    }

    // Check for duplicate name if changing it
    if (nombre_categoria && nombre_categoria.trim() !== categoria.nombre_categoria) {
      const existente = await CategoriaGasto.findOne({
        where: {
          nombre_categoria: nombre_categoria.trim(),
          id: { [Op.ne]: id },
          [Op.or]: [
            { es_sistema: true },
            { usuario_id: usuarioId }
          ]
        }
      });

      if (existente) {
        return sendError(res, 400, 'Ya existe una categoría con ese nombre');
      }
    }

    await categoria.update({
      nombre_categoria: nombre_categoria?.trim() ?? categoria.nombre_categoria,
      icono: icono ?? categoria.icono,
      orden: orden ?? categoria.orden,
      activo: activo ?? categoria.activo
    });

    return sendSuccess(res, categoria);
  } catch (error) {
    logger.error('Error al actualizar categoría:', { error });
    return sendError(res, 500, 'Error al actualizar categoría', error.message);
  }
};

// PATCH /api/categorias/:id/toggle-activo - Toggle active status
export const toggleActivo = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const categoria = await CategoriaGasto.findByPk(id);

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    // Can't toggle system categories
    if (categoria.es_sistema) {
      return sendError(res, 403, 'No se pueden modificar categorías del sistema');
    }

    // Can only toggle own categories
    if (categoria.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para modificar esta categoría');
    }

    await categoria.update({ activo: !categoria.activo });

    return sendSuccess(res, categoria);
  } catch (error) {
    logger.error('Error al cambiar estado de categoría:', { error });
    return sendError(res, 500, 'Error al cambiar estado de categoría', error.message);
  }
};

// DELETE /api/categorias/:id - Delete a personal category (only if not in use)
export const eliminarCategoria = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const categoria = await CategoriaGasto.findByPk(id);

    if (!categoria) {
      return sendError(res, 404, 'Categoría no encontrada');
    }

    // Can't delete system categories
    if (categoria.es_sistema) {
      return sendError(res, 403, 'No se pueden eliminar categorías del sistema');
    }

    // Can only delete own categories
    if (categoria.usuario_id !== usuarioId) {
      return sendError(res, 403, 'No tienes permiso para eliminar esta categoría');
    }

    // Check if category is in use
    const [gastos, gastosUnicos, gastosRecurrentes, debitos, compras] = await Promise.all([
      Gasto.count({ where: { categoria_id: id, usuario_id: usuarioId } }),
      GastoUnico.count({ where: { categoria_id: id, usuario_id: usuarioId } }),
      GastoRecurrente.count({ where: { categoria_id: id, usuario_id: usuarioId } }),
      DebitoAutomatico.count({ where: { categoria_id: id, usuario_id: usuarioId } }),
      Compra.count({ where: { categoria_id: id, usuario_id: usuarioId } })
    ]);

    const totalUsos = gastos + gastosUnicos + gastosRecurrentes + debitos + compras;

    if (totalUsos > 0) {
      return sendError(res, 400, `No se puede eliminar la categoría porque está siendo usada en ${totalUsos} registro(s). Desactívala en su lugar.`);
    }

    await categoria.destroy();

    return sendSuccess(res, { message: 'Categoría eliminada correctamente' });
  } catch (error) {
    logger.error('Error al eliminar categoría:', { error });
    return sendError(res, 500, 'Error al eliminar categoría', error.message);
  }
};
