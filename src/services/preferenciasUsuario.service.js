import { PreferenciasUsuario } from '../models/index.js';
import { MODULOS_DISPONIBLES, MODULOS_DEFAULT, DASHBOARD_SECTIONS_DISPONIBLES, DASHBOARD_SECTIONS_DEFAULT } from '../models/PreferenciasUsuario.model.js';

/**
 * Obtiene las preferencias de un usuario, creándolas si no existen
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<PreferenciasUsuario>}
 */
export async function getOrCreatePreferencias(usuarioId) {
  let preferencias = await PreferenciasUsuario.findOne({
    where: { usuario_id: usuarioId }
  });

  if (!preferencias) {
    preferencias = await PreferenciasUsuario.create({
      usuario_id: usuarioId,
      modulos_activos: MODULOS_DEFAULT,
      tema: 'system',
      dashboard_sections: DASHBOARD_SECTIONS_DEFAULT
    });
  }

  return preferencias;
}

/**
 * Obtiene las preferencias de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<PreferenciasUsuario|null>}
 */
export async function getPreferencias(usuarioId) {
  return PreferenciasUsuario.findOne({
    where: { usuario_id: usuarioId }
  });
}

/**
 * Actualiza las preferencias de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<PreferenciasUsuario>}
 */
export async function updatePreferencias(usuarioId, data) {
  const preferencias = await getOrCreatePreferencias(usuarioId);

  const updateData = {};

  if (data.modulos_activos !== undefined) {
    // Validar que todos los módulos existan
    const modulosValidos = data.modulos_activos.filter(
      modulo => MODULOS_DISPONIBLES[modulo] !== undefined
    );
    updateData.modulos_activos = modulosValidos;
  }

  if (data.tema !== undefined) {
    updateData.tema = data.tema;
  }

  if (data.balance_inicial !== undefined) {
    updateData.balance_inicial = data.balance_inicial;
  }

  if (data.dashboard_sections !== undefined) {
    const seccionesValidas = data.dashboard_sections.filter(
      s => DASHBOARD_SECTIONS_DISPONIBLES.includes(s)
    );
    updateData.dashboard_sections = seccionesValidas;
  }

  await preferencias.update(updateData);
  return preferencias;
}

/**
 * Activa o desactiva un módulo específico
 * @param {number} usuarioId - ID del usuario
 * @param {string} modulo - Nombre del módulo
 * @param {boolean} activo - Si activar o desactivar
 * @returns {Promise<PreferenciasUsuario>}
 */
export async function toggleModulo(usuarioId, modulo, activo) {
  // Validar que el módulo existe
  if (!MODULOS_DISPONIBLES[modulo]) {
    throw new Error(`Módulo '${modulo}' no existe`);
  }

  // Los módulos core no se pueden desactivar
  if (MODULOS_DISPONIBLES[modulo].core && !activo) {
    throw new Error(`El módulo '${modulo}' es un módulo core y no puede ser desactivado`);
  }

  const preferencias = await getOrCreatePreferencias(usuarioId);
  let modulosActivos = [...preferencias.modulos_activos];

  if (activo && !modulosActivos.includes(modulo)) {
    modulosActivos.push(modulo);
  } else if (!activo && modulosActivos.includes(modulo)) {
    modulosActivos = modulosActivos.filter(m => m !== modulo);
  }

  await preferencias.update({ modulos_activos: modulosActivos });
  return preferencias;
}

/**
 * Obtiene la lista de módulos disponibles con su estado para un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>}
 */
export async function getModulosConEstado(usuarioId) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  const modulosActivos = preferencias.modulos_activos;

  const modulos = {};
  for (const [key, config] of Object.entries(MODULOS_DISPONIBLES)) {
    modulos[key] = {
      ...config,
      activo: config.core || modulosActivos.includes(key)
    };
  }

  return modulos;
}

/**
 * Verifica si un módulo está activo para un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} modulo - Nombre del módulo
 * @returns {Promise<boolean>}
 */
export async function isModuloActivo(usuarioId, modulo) {
  if (!MODULOS_DISPONIBLES[modulo]) {
    return false;
  }

  // Módulos core siempre están activos
  if (MODULOS_DISPONIBLES[modulo].core) {
    return true;
  }

  const preferencias = await getOrCreatePreferencias(usuarioId);
  return preferencias.modulos_activos.includes(modulo);
}

/**
 * Toggle visibility of a system category for a user
 * @param {number} usuarioId - User ID
 * @param {number} categoriaId - Category ID
 * @returns {Promise<{visible: boolean, preferencias: PreferenciasUsuario}>}
 */
export async function toggleCategoriaVisibilidad(usuarioId, categoriaId) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  let categoriasOcultas = [...(preferencias.categorias_ocultas || [])];

  const isCurrentlyHidden = categoriasOcultas.includes(categoriaId);

  if (isCurrentlyHidden) {
    // Remove from hidden list (make visible)
    categoriasOcultas = categoriasOcultas.filter(id => id !== categoriaId);
  } else {
    // Add to hidden list
    categoriasOcultas.push(categoriaId);
  }

  await preferencias.update({ categorias_ocultas: categoriasOcultas });

  return {
    visible: isCurrentlyHidden, // If it was hidden, now it's visible
    preferencias
  };
}

/**
 * Toggle visibility of a system income source for a user
 * @param {number} usuarioId - User ID
 * @param {number} fuenteId - Income source ID
 * @returns {Promise<{visible: boolean, preferencias: PreferenciasUsuario}>}
 */
export async function toggleFuenteVisibilidad(usuarioId, fuenteId) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  let fuentesOcultas = [...(preferencias.fuentes_ocultas || [])];

  const isCurrentlyHidden = fuentesOcultas.includes(fuenteId);

  if (isCurrentlyHidden) {
    // Remove from hidden list (make visible)
    fuentesOcultas = fuentesOcultas.filter(id => id !== fuenteId);
  } else {
    // Add to hidden list
    fuentesOcultas.push(fuenteId);
  }

  await preferencias.update({ fuentes_ocultas: fuentesOcultas });

  return {
    visible: isCurrentlyHidden, // If it was hidden, now it's visible
    preferencias
  };
}

/**
 * Check if a category is visible for a user
 * @param {number} usuarioId - User ID
 * @param {number} categoriaId - Category ID
 * @returns {Promise<boolean>}
 */
export async function isCategoriaVisible(usuarioId, categoriaId) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  const categoriasOcultas = preferencias.categorias_ocultas || [];
  return !categoriasOcultas.includes(categoriaId);
}

/**
 * Check if an income source is visible for a user
 * @param {number} usuarioId - User ID
 * @param {number} fuenteId - Income source ID
 * @returns {Promise<boolean>}
 */
export async function isFuenteVisible(usuarioId, fuenteId) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  const fuentesOcultas = preferencias.fuentes_ocultas || [];
  return !fuentesOcultas.includes(fuenteId);
}

export default {
  getOrCreatePreferencias,
  getPreferencias,
  updatePreferencias,
  toggleModulo,
  getModulosConEstado,
  isModuloActivo,
  toggleCategoriaVisibilidad,
  toggleFuenteVisibilidad,
  isCategoriaVisible,
  isFuenteVisible
};
