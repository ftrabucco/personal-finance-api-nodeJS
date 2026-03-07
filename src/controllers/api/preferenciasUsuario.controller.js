import logger from '../../utils/logger.js';
import { sendError, sendSuccess } from '../../utils/responseHelper.js';
import preferenciasService from '../../services/preferenciasUsuario.service.js';
import { MODULOS_DISPONIBLES } from '../../models/PreferenciasUsuario.model.js';

/**
 * Obtiene las preferencias del usuario autenticado
 */
export async function getPreferencias(req, res) {
  try {
    const usuarioId = req.user.id;
    const preferencias = await preferenciasService.getOrCreatePreferencias(usuarioId);

    return sendSuccess(res, preferencias);
  } catch (error) {
    logger.error('Error al obtener preferencias:', { error });
    return sendError(res, 500, 'Error al obtener preferencias', error.message);
  }
}

/**
 * Actualiza las preferencias del usuario autenticado
 */
export async function updatePreferencias(req, res) {
  try {
    const usuarioId = req.user.id;
    const { modulos_activos, tema } = req.body;

    const preferencias = await preferenciasService.updatePreferencias(usuarioId, {
      modulos_activos,
      tema
    });

    logger.info('Preferencias actualizadas:', { usuarioId });
    return sendSuccess(res, preferencias);
  } catch (error) {
    logger.error('Error al actualizar preferencias:', { error });
    return sendError(res, 500, 'Error al actualizar preferencias', error.message);
  }
}

/**
 * Toggle de un módulo específico
 */
export async function toggleModulo(req, res) {
  try {
    const usuarioId = req.user.id;
    const { modulo, activo } = req.body;

    if (!modulo) {
      return sendError(res, 400, 'El campo "modulo" es requerido');
    }

    if (typeof activo !== 'boolean') {
      return sendError(res, 400, 'El campo "activo" debe ser un booleano');
    }

    const preferencias = await preferenciasService.toggleModulo(usuarioId, modulo, activo);

    logger.info('Módulo toggled:', { usuarioId, modulo, activo });
    return sendSuccess(res, preferencias);
  } catch (error) {
    logger.error('Error al toggle módulo:', { error });

    if (error.message.includes('no existe') || error.message.includes('core')) {
      return sendError(res, 400, error.message);
    }

    return sendError(res, 500, 'Error al cambiar estado del módulo', error.message);
  }
}

/**
 * Obtiene todos los módulos disponibles con su estado
 */
export async function getModulos(req, res) {
  try {
    const usuarioId = req.user.id;
    const modulos = await preferenciasService.getModulosConEstado(usuarioId);

    return sendSuccess(res, modulos);
  } catch (error) {
    logger.error('Error al obtener módulos:', { error });
    return sendError(res, 500, 'Error al obtener módulos', error.message);
  }
}

/**
 * Obtiene la lista de módulos disponibles (sin estado de usuario)
 */
export async function getModulosDisponibles(req, res) {
  try {
    return sendSuccess(res, MODULOS_DISPONIBLES);
  } catch (error) {
    logger.error('Error al obtener módulos disponibles:', { error });
    return sendError(res, 500, 'Error al obtener módulos disponibles', error.message);
  }
}

export default {
  getPreferencias,
  updatePreferencias,
  toggleModulo,
  getModulos,
  getModulosDisponibles
};
