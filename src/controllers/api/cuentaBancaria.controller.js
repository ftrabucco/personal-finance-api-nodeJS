import { BaseController } from './base.controller.js';
import { CuentaBancaria } from '../../models/index.js';
import { CuentaBancariaService } from '../../services/cuentaBancaria.service.js';
import { sendError, sendSuccess, sendPaginatedSuccess } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

export class CuentaBancariaController extends BaseController {
  constructor() {
    super(CuentaBancaria, 'CuentaBancaria');
    this.cuentaBancariaService = new CuentaBancariaService();
  }

  getIncludes() {
    return [];
  }

  getRelationships() {
    return {};
  }

  /**
   * Obtiene todas las cuentas bancarias del usuario con filtros opcionales
   */
  async getWithFilters(req, res) {
    try {
      const result = await this.cuentaBancariaService.getWithFilters(req.query, req.user.id);

      if (result.meta.limit && result.meta.limit < result.meta.total) {
        return sendPaginatedSuccess(res, result.data, result.meta);
      }

      return sendSuccess(res, result.data);
    } catch (error) {
      logger.error('Error al obtener cuentas bancarias con filtros:', { error, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener cuentas bancarias', error.message);
    }
  }

  /**
   * Obtiene una cuenta bancaria por ID (solo si pertenece al usuario)
   */
  async getById(req, res) {
    try {
      const cuenta = await this.cuentaBancariaService.findByIdAndUser(req.params.id, req.user.id);

      if (!cuenta) {
        return sendError(res, 404, 'Cuenta bancaria no encontrada');
      }

      return sendSuccess(res, cuenta);
    } catch (error) {
      logger.error('Error al obtener cuenta bancaria por ID:', { error, cuentaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener cuenta bancaria', error.message);
    }
  }

  /**
   * Crea una nueva cuenta bancaria para el usuario autenticado
   */
  async create(req, res) {
    try {
      // Normalizar datos
      const normalizedData = this.cuentaBancariaService.normalizeCuentaData(req.body);

      // Asignar usuario autenticado
      normalizedData.usuario_id = req.user.id;

      const cuenta = await this.model.create(normalizedData);

      logger.info('Cuenta bancaria creada exitosamente:', {
        cuentaId: cuenta.id,
        userId: req.user.id,
        tipo: cuenta.tipo,
        nombre: cuenta.nombre
      });

      return sendSuccess(res, cuenta, 201);
    } catch (error) {
      logger.error('Error al crear cuenta bancaria:', { error, userId: req.user.id, data: req.body });
      return sendError(res, 500, 'Error al crear cuenta bancaria', error.message);
    }
  }

  /**
   * Actualiza una cuenta bancaria (solo si pertenece al usuario)
   */
  async update(req, res) {
    try {
      // Verificar que la cuenta pertenece al usuario
      const cuenta = await this.cuentaBancariaService.findByIdAndUser(req.params.id, req.user.id);
      if (!cuenta) {
        return sendError(res, 404, 'Cuenta bancaria no encontrada');
      }

      // Normalizar datos
      const normalizedData = this.cuentaBancariaService.normalizeCuentaData(req.body);

      // No permitir cambiar el usuario_id
      delete normalizedData.usuario_id;

      await cuenta.update(normalizedData);

      logger.info('Cuenta bancaria actualizada exitosamente:', {
        cuentaId: cuenta.id,
        userId: req.user.id,
        tipo: cuenta.tipo
      });

      return sendSuccess(res, cuenta);
    } catch (error) {
      logger.error('Error al actualizar cuenta bancaria:', { error, cuentaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al actualizar cuenta bancaria', error.message);
    }
  }

  /**
   * Elimina una cuenta bancaria (solo si pertenece al usuario y no está en uso)
   */
  async delete(req, res) {
    try {
      // Verificar que la cuenta pertenece al usuario
      const cuenta = await this.cuentaBancariaService.findByIdAndUser(req.params.id, req.user.id);
      if (!cuenta) {
        return sendError(res, 404, 'Cuenta bancaria no encontrada');
      }

      // Verificar si la cuenta está en uso
      const usageValidation = await this.cuentaBancariaService.validateCuentaUsage(cuenta.id);
      if (usageValidation.inUse) {
        return sendError(res, 400, 'No se puede eliminar la cuenta bancaria',
          `La cuenta está siendo utilizada en ${usageValidation.usage.total} débito(s) automático(s)`
        );
      }

      await cuenta.destroy();

      logger.info('Cuenta bancaria eliminada exitosamente:', {
        cuentaId: cuenta.id,
        userId: req.user.id,
        nombre: cuenta.nombre
      });

      return sendSuccess(res, {
        message: 'Cuenta bancaria eliminada exitosamente',
        cuenta: {
          id: cuenta.id,
          nombre: cuenta.nombre,
          tipo: cuenta.tipo
        }
      });
    } catch (error) {
      logger.error('Error al eliminar cuenta bancaria:', { error, cuentaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al eliminar cuenta bancaria', error.message);
    }
  }

  /**
   * Obtiene estadísticas de cuentas bancarias del usuario
   */
  async getStats(req, res) {
    try {
      const stats = await this.cuentaBancariaService.getUserAccountStats(req.user.id);

      return sendSuccess(res, {
        estadisticas: stats,
        usuario_id: req.user.id
      });
    } catch (error) {
      logger.error('Error al obtener estadísticas de cuentas bancarias:', { error, userId: req.user.id });
      return sendError(res, 500, 'Error al obtener estadísticas', error.message);
    }
  }

  /**
   * Valida el uso de una cuenta bancaria específica
   */
  async validateUsage(req, res) {
    try {
      // Verificar que la cuenta pertenece al usuario
      const cuenta = await this.cuentaBancariaService.findByIdAndUser(req.params.id, req.user.id);
      if (!cuenta) {
        return sendError(res, 404, 'Cuenta bancaria no encontrada');
      }

      const usageValidation = await this.cuentaBancariaService.validateCuentaUsage(cuenta.id);

      return sendSuccess(res, {
        cuenta: {
          id: cuenta.id,
          nombre: cuenta.nombre,
          tipo: cuenta.tipo
        },
        ...usageValidation
      });
    } catch (error) {
      logger.error('Error al validar uso de cuenta bancaria:', { error, cuentaId: req.params.id, userId: req.user.id });
      return sendError(res, 500, 'Error al validar uso de cuenta bancaria', error.message);
    }
  }
}

// Crear instancia del controlador
const cuentaBancariaController = new CuentaBancariaController();

// Exportar métodos
export const obtenerCuentasBancarias = cuentaBancariaController.getWithFilters.bind(cuentaBancariaController);
export const obtenerCuentaBancariaPorId = cuentaBancariaController.getById.bind(cuentaBancariaController);
export const crearCuentaBancaria = cuentaBancariaController.create.bind(cuentaBancariaController);
export const actualizarCuentaBancaria = cuentaBancariaController.update.bind(cuentaBancariaController);
export const eliminarCuentaBancaria = cuentaBancariaController.delete.bind(cuentaBancariaController);
export const obtenerEstadisticasCuentasBancarias = cuentaBancariaController.getStats.bind(cuentaBancariaController);
export const validarUsoCuentaBancaria = cuentaBancariaController.validateUsage.bind(cuentaBancariaController);
