import { BaseController } from './base.controller.js';
import { Tarjeta } from '../../models/index.js';
import { TarjetaService } from '../../services/tarjeta.service.js';
import { sendError, sendSuccess, sendPaginatedSuccess } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

export class TarjetaController extends BaseController {
  constructor() {
    super(Tarjeta, 'Tarjeta');
    this.tarjetaService = new TarjetaService();
  }

  getIncludes() {
    return []; // Tarjetas no tienen relaciones que incluir por ahora
  }

  getRelationships() {
    return {}; // No hay relaciones FK a validar
  }

  /**
   * Obtiene todas las tarjetas del usuario con filtros opcionales
   */
  async getWithFilters(req, res) {
    try {
      const result = await this.tarjetaService.getWithFilters(req.query, req.user.id);

      if (result.meta.limit && result.meta.limit < result.meta.total) {
        return sendPaginatedSuccess(res, result.data, result.meta);
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      logger.error('Error al obtener tarjetas con filtros:', { error, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener tarjetas', error.message);
    }
  }

  /**
   * Obtiene una tarjeta por ID (solo si pertenece al usuario)
   */
  async getById(req, res) {
    try {
      const tarjeta = await this.tarjetaService.findByIdAndUser(req.params.id, req.user.id);

      if (!tarjeta) {
        return sendError(res, 404, 'Tarjeta no encontrada');
      }

      return sendSuccess(res, tarjeta);
    } catch (error) {
      logger.error('Error al obtener tarjeta por ID:', { error, tarjetaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener tarjeta', error.message);
    }
  }

  /**
   * Crea una nueva tarjeta para el usuario autenticado
   */
  async create(req, res) {
    try {
      // Normalizar datos según tipo de tarjeta
      const normalizedData = this.tarjetaService.normalizeTarjetaData(req.body);

      // Asignar usuario autenticado
      normalizedData.usuario_id = req.user.id;

      const tarjeta = await this.model.create(normalizedData);

      logger.info('Tarjeta creada exitosamente:', {
        tarjetaId: tarjeta.id,
        userId: req.user.id,
        tipo: tarjeta.tipo,
        nombre: tarjeta.nombre
      });

      return sendSuccess(res, tarjeta, 201);
    } catch (error) {
      logger.error('Error al crear tarjeta:', { error, userId: req.user.id, data: req.body });
      return sendError(res, 500, 'Error al crear tarjeta', error.message);
    }
  }

  /**
   * Actualiza una tarjeta (solo si pertenece al usuario)
   */
  async update(req, res) {
    try {
      // Verificar que la tarjeta pertenece al usuario
      const tarjeta = await this.tarjetaService.findByIdAndUser(req.params.id, req.user.id);
      if (!tarjeta) {
        return sendError(res, 404, 'Tarjeta no encontrada');
      }

      // Normalizar datos según tipo de tarjeta
      const normalizedData = this.tarjetaService.normalizeTarjetaData(req.body);

      // No permitir cambiar el usuario_id
      delete normalizedData.usuario_id;

      await tarjeta.update(normalizedData);

      logger.info('Tarjeta actualizada exitosamente:', {
        tarjetaId: tarjeta.id,
        userId: req.user.id,
        tipo: tarjeta.tipo
      });

      return sendSuccess(res, tarjeta);
    } catch (error) {
      logger.error('Error al actualizar tarjeta:', { error, tarjetaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al actualizar tarjeta', error.message);
    }
  }

  /**
   * Elimina una tarjeta (solo si pertenece al usuario y no está en uso)
   */
  async delete(req, res) {
    try {
      // Verificar que la tarjeta pertenece al usuario
      const tarjeta = await this.tarjetaService.findByIdAndUser(req.params.id, req.user.id);
      if (!tarjeta) {
        return sendError(res, 404, 'Tarjeta no encontrada');
      }

      // Verificar si la tarjeta está en uso
      const usageValidation = await this.tarjetaService.validateTarjetaUsage(tarjeta.id);
      if (usageValidation.inUse) {
        return sendError(res, 400, 'No se puede eliminar la tarjeta',
          `La tarjeta está siendo utilizada en ${usageValidation.usage.total} registro(s) (${usageValidation.usage.gastos} gastos, ${usageValidation.usage.compras} compras)`
        );
      }

      await tarjeta.destroy();

      logger.info('Tarjeta eliminada exitosamente:', {
        tarjetaId: tarjeta.id,
        userId: req.user.id,
        nombre: tarjeta.nombre
      });

      return sendSuccess(res, {
        message: 'Tarjeta eliminada exitosamente',
        tarjeta: {
          id: tarjeta.id,
          nombre: tarjeta.nombre,
          tipo: tarjeta.tipo
        }
      });
    } catch (error) {
      logger.error('Error al eliminar tarjeta:', { error, tarjetaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al eliminar tarjeta', error.message);
    }
  }

  /**
   * Obtiene estadísticas de tarjetas del usuario
   */
  async getStats(req, res) {
    try {
      const stats = await this.tarjetaService.getUserCardStats(req.user.id);

      return sendSuccess(res, {
        estadisticas: stats,
        usuario_id: req.user.id
      });
    } catch (error) {
      logger.error('Error al obtener estadísticas de tarjetas:', { error, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener estadísticas', error.message);
    }
  }

  /**
   * Valida el uso de una tarjeta específica
   */
  async validateUsage(req, res) {
    try {
      // Verificar que la tarjeta pertenece al usuario
      const tarjeta = await this.tarjetaService.findByIdAndUser(req.params.id, req.user.id);
      if (!tarjeta) {
        return sendError(res, 404, 'Tarjeta no encontrada');
      }

      const usageValidation = await this.tarjetaService.validateTarjetaUsage(tarjeta.id);

      return sendSuccess(res, {
        tarjeta: {
          id: tarjeta.id,
          nombre: tarjeta.nombre,
          tipo: tarjeta.tipo
        },
        ...usageValidation
      });
    } catch (error) {
      logger.error('Error al validar uso de tarjeta:', { error, tarjetaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al validar uso de tarjeta', error.message);
    }
  }
}

// Crear instancia del controlador
const tarjetaController = new TarjetaController();

// Exportar métodos
export const obtenerTarjetas = tarjetaController.getWithFilters.bind(tarjetaController);
export const obtenerTarjetaPorId = tarjetaController.getById.bind(tarjetaController);
export const crearTarjeta = tarjetaController.create.bind(tarjetaController);
export const actualizarTarjeta = tarjetaController.update.bind(tarjetaController);
export const eliminarTarjeta = tarjetaController.delete.bind(tarjetaController);
export const obtenerEstadisticasTarjetas = tarjetaController.getStats.bind(tarjetaController);
export const validarUsoTarjeta = tarjetaController.validateUsage.bind(tarjetaController);
