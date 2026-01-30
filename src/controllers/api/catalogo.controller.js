import { CategoriaGasto, ImportanciaGasto, TipoPago, FrecuenciaGasto } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

/**
 * Controller for catalog data (categorias, importancias, tipos_pago, frecuencias)
 * These are read-only endpoints that return reference data for forms
 */

// GET /api/catalogos/categorias
export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await CategoriaGasto.findAll({
      order: [['id', 'ASC']]
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

// GET /api/catalogos - Returns all catalogs in a single request
export const obtenerTodosCatalogos = async (req, res) => {
  try {
    const [categorias, importancias, tiposPago, frecuencias] = await Promise.all([
      CategoriaGasto.findAll({ order: [['id', 'ASC']] }),
      ImportanciaGasto.findAll({ order: [['id', 'ASC']] }),
      TipoPago.findAll({ order: [['id', 'ASC']] }),
      FrecuenciaGasto.findAll({ order: [['id', 'ASC']] })
    ]);

    return sendSuccess(res, {
      categorias,
      importancias,
      tiposPago,
      frecuencias
    });
  } catch (error) {
    logger.error('Error al obtener catálogos:', { error });
    return sendError(res, 500, 'Error al obtener catálogos', error.message);
  }
};
