import { CategoriaGasto, ImportanciaGasto, TipoPago, FrecuenciaGasto, FuenteIngreso } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Controller for catalog data (categorias, importancias, tipos_pago, frecuencias)
 * These are read-only endpoints that return reference data for forms
 * Now supports user-specific categories and income sources
 */

// GET /api/catalogos/categorias - Returns system categories + user's custom categories
export const obtenerCategorias = async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    const whereClause = {
      activo: true,
      [Op.or]: [
        { usuario_id: null },        // System categories
        ...(usuarioId ? [{ usuario_id: usuarioId }] : [])  // User's custom categories
      ]
    };

    const categorias = await CategoriaGasto.findAll({
      where: whereClause,
      order: [['orden', 'ASC'], ['nombre_categoria', 'ASC']]
    });

    return sendSuccess(res, categorias);
  } catch (error) {
    logger.error('Error al obtener categorías:', { error });
    return sendError(res, 500, 'Error al obtener categorías', error.message);
  }
};

// GET /api/catalogos/importancias
export const obtenerImportancias = async (req, res) => {
  try {
    const importancias = await ImportanciaGasto.findAll({
      order: [['id', 'ASC']]
    });
    return sendSuccess(res, importancias);
  } catch (error) {
    logger.error('Error al obtener importancias:', { error });
    return sendError(res, 500, 'Error al obtener importancias', error.message);
  }
};

// GET /api/catalogos/tipos-pago
export const obtenerTiposPago = async (req, res) => {
  try {
    const tiposPago = await TipoPago.findAll({
      order: [['id', 'ASC']]
    });
    return sendSuccess(res, tiposPago);
  } catch (error) {
    logger.error('Error al obtener tipos de pago:', { error });
    return sendError(res, 500, 'Error al obtener tipos de pago', error.message);
  }
};

// GET /api/catalogos/frecuencias
export const obtenerFrecuencias = async (req, res) => {
  try {
    const frecuencias = await FrecuenciaGasto.findAll({
      order: [['id', 'ASC']]
    });
    return sendSuccess(res, frecuencias);
  } catch (error) {
    logger.error('Error al obtener frecuencias:', { error });
    return sendError(res, 500, 'Error al obtener frecuencias', error.message);
  }
};

// GET /api/catalogos/fuentes-ingreso - Returns system sources + user's custom sources
export const obtenerFuentesIngreso = async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    const whereClause = {
      activo: true,
      [Op.or]: [
        { usuario_id: null },        // System sources
        ...(usuarioId ? [{ usuario_id: usuarioId }] : [])  // User's custom sources
      ]
    };

    const fuentesIngreso = await FuenteIngreso.findAll({
      where: whereClause,
      order: [['orden', 'ASC'], ['nombre', 'ASC']]
    });

    return sendSuccess(res, fuentesIngreso);
  } catch (error) {
    logger.error('Error al obtener fuentes de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuentes de ingreso', error.message);
  }
};

// GET /api/catalogos - Returns all catalogs in a single request
export const obtenerTodosCatalogos = async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    const categoriasWhere = {
      activo: true,
      [Op.or]: [
        { usuario_id: null },
        ...(usuarioId ? [{ usuario_id: usuarioId }] : [])
      ]
    };

    const fuentesWhere = {
      activo: true,
      [Op.or]: [
        { usuario_id: null },
        ...(usuarioId ? [{ usuario_id: usuarioId }] : [])
      ]
    };

    const [categorias, importancias, tiposPago, frecuencias, fuentesIngreso] = await Promise.all([
      CategoriaGasto.findAll({ where: categoriasWhere, order: [['orden', 'ASC'], ['nombre_categoria', 'ASC']] }),
      ImportanciaGasto.findAll({ order: [['id', 'ASC']] }),
      TipoPago.findAll({ order: [['id', 'ASC']] }),
      FrecuenciaGasto.findAll({ order: [['id', 'ASC']] }),
      FuenteIngreso.findAll({ where: fuentesWhere, order: [['orden', 'ASC'], ['nombre', 'ASC']] })
    ]);

    return sendSuccess(res, {
      categorias,
      importancias,
      tiposPago,
      frecuencias,
      fuentesIngreso
    });
  } catch (error) {
    logger.error('Error al obtener catálogos:', { error });
    return sendError(res, 500, 'Error al obtener catálogos', error.message);
  }
};
