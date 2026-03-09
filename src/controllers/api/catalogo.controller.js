import { CategoriaGasto, ImportanciaGasto, TipoPago, FrecuenciaGasto, FuenteIngreso } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';
import { getOrCreatePreferencias } from '../../services/preferenciasUsuario.service.js';

/**
 * Controller for catalog data (categorias, importancias, tipos_pago, frecuencias)
 * These are read-only endpoints that return reference data for forms
 * Filters out hidden categories/fuentes based on user preferences
 */

// GET /api/catalogos/categorias
export const obtenerCategorias = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Get user preferences to know which system categories are hidden
    const preferencias = await getOrCreatePreferencias(usuarioId);
    const categoriasOcultas = preferencias.categorias_ocultas || [];

    // Get system categories + user's personal categories (only active)
    const categorias = await CategoriaGasto.findAll({
      where: {
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId, activo: true }
        ]
      },
      order: [
        ['es_sistema', 'DESC'],
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    // Filter out hidden system categories
    const resultado = categorias.filter(cat => {
      if (cat.es_sistema) {
        return !categoriasOcultas.includes(cat.id);
      }
      return true; // Personal categories are already filtered by activo
    });

    return sendSuccess(res, resultado);
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

// GET /api/catalogos/fuentes-ingreso
export const obtenerFuentesIngreso = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Get user preferences to know which system fuentes are hidden
    const preferencias = await getOrCreatePreferencias(usuarioId);
    const fuentesOcultas = preferencias.fuentes_ocultas || [];

    // Get system fuentes + user's personal fuentes (only active)
    const fuentesIngreso = await FuenteIngreso.findAll({
      where: {
        [Op.or]: [
          { es_sistema: true },
          { usuario_id: usuarioId, activo: true }
        ]
      },
      order: [
        ['es_sistema', 'DESC'],
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    // Filter out hidden system fuentes
    const resultado = fuentesIngreso.filter(fuente => {
      if (fuente.es_sistema) {
        return !fuentesOcultas.includes(fuente.id);
      }
      return true; // Personal fuentes are already filtered by activo
    });

    return sendSuccess(res, resultado);
  } catch (error) {
    logger.error('Error al obtener fuentes de ingreso:', { error });
    return sendError(res, 500, 'Error al obtener fuentes de ingreso', error.message);
  }
};

// GET /api/catalogos - Returns all catalogs in a single request
export const obtenerTodosCatalogos = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Get user preferences for hidden items
    const preferencias = await getOrCreatePreferencias(usuarioId);
    const categoriasOcultas = preferencias.categorias_ocultas || [];
    const fuentesOcultas = preferencias.fuentes_ocultas || [];

    const [categoriasRaw, importancias, tiposPago, frecuencias, fuentesRaw] = await Promise.all([
      CategoriaGasto.findAll({
        where: {
          [Op.or]: [
            { es_sistema: true },
            { usuario_id: usuarioId, activo: true }
          ]
        },
        order: [['es_sistema', 'DESC'], ['orden', 'ASC'], ['id', 'ASC']]
      }),
      ImportanciaGasto.findAll({ order: [['id', 'ASC']] }),
      TipoPago.findAll({ order: [['id', 'ASC']] }),
      FrecuenciaGasto.findAll({ order: [['id', 'ASC']] }),
      FuenteIngreso.findAll({
        where: {
          [Op.or]: [
            { es_sistema: true },
            { usuario_id: usuarioId, activo: true }
          ]
        },
        order: [['es_sistema', 'DESC'], ['orden', 'ASC'], ['id', 'ASC']]
      })
    ]);

    // Filter out hidden system items
    const categorias = categoriasRaw.filter(cat =>
      !cat.es_sistema || !categoriasOcultas.includes(cat.id)
    );
    const fuentesIngreso = fuentesRaw.filter(fuente =>
      !fuente.es_sistema || !fuentesOcultas.includes(fuente.id)
    );

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
