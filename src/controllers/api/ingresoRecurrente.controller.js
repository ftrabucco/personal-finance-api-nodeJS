import { BaseController } from './base.controller.js';
import { IngresoRecurrente, FuenteIngreso, FrecuenciaGasto } from '../../models/index.js';
import { IngresoRecurrenteService } from '../../services/ingresoRecurrente.service.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

export class IngresoRecurrenteController extends BaseController {
  constructor() {
    super(IngresoRecurrente, 'Ingreso Recurrente');
    this.ingresoRecurrenteService = new IngresoRecurrenteService();
  }

  getIncludes() {
    return [
      { model: FuenteIngreso, as: 'fuenteIngreso' },
      { model: FrecuenciaGasto, as: 'frecuencia' }
    ];
  }

  getRelationships() {
    return {
      fuente_ingreso_id: { model: FuenteIngreso, name: 'Fuente de Ingreso' },
      frecuencia_gasto_id: { model: FrecuenciaGasto, name: 'Frecuencia' }
    };
  }

  // Crear ingreso recurrente
  async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de IngresoRecurrente
      const validationResult = this.validateIngresoRecurrenteFields(req.body);
      if (!validationResult.isValid) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', validationResult.message);
      }

      // 💱 Calculate multi-currency fields
      const monto = req.body.monto;
      const monedaOrigen = req.body.moneda_origen || 'ARS';

      let ingresoData = {
        ...req.body,
        usuario_id: req.user.id,
        activo: true,
        moneda_origen: monedaOrigen
      };

      // Calculate monto_ars, monto_usd, tipo_cambio_referencia
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

        ingresoData = {
          ...ingresoData,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        };

        logger.debug('Multi-currency conversion applied to IngresoRecurrente', {
          moneda_origen: monedaOrigen,
          monto,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        });
      } catch (exchangeError) {
        logger.warn('Exchange rate conversion failed for IngresoRecurrente', {
          error: exchangeError.message
        });
        ingresoData.monto_ars = monto;
        ingresoData.monto_usd = null;
      }

      // Crear el ingreso recurrente
      const ingresoRecurrente = await this.model.create(ingresoData, {
        transaction,
        include: [{ model: FrecuenciaGasto, as: 'frecuencia' }]
      });

      // Recargar con includes
      const ingresoRecurrenteCompleto = await this.model.findByPk(ingresoRecurrente.id, {
        include: this.getIncludes(),
        transaction
      });

      await transaction.commit();
      logger.info('Ingreso recurrente creado exitosamente:', {
        ingresoRecurrente_id: ingresoRecurrente.id,
        descripcion: ingresoRecurrente.descripcion,
        dia_de_pago: ingresoRecurrente.dia_de_pago
      });

      return sendSuccess(res, { ingresoRecurrente: ingresoRecurrenteCompleto }, 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al crear ingreso recurrente:', { error });
      return sendError(res, 500, 'Error al crear ingreso recurrente', error.message);
    }
  }

  // Obtener ingreso recurrente por ID (con validación de usuario)
  async getById(req, res) {
    try {
      const ingresoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        },
        include: this.getIncludes()
      });

      if (!ingresoRecurrente) {
        return sendError(res, 404, 'Ingreso recurrente no encontrado');
      }

      return sendSuccess(res, ingresoRecurrente);
    } catch (error) {
      logger.error('Error al obtener ingreso recurrente:', { error });
      return sendError(res, 500, 'Error al obtener ingreso recurrente', error.message);
    }
  }

  // Actualizar ingreso recurrente
  async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const ingresoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!ingresoRecurrente) {
        await transaction.rollback();
        return sendError(res, 404, 'Ingreso recurrente no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos si se están actualizando
      if (Object.keys(req.body).some(key => ['monto', 'dia_de_pago', 'mes_de_pago', 'frecuencia_gasto_id'].includes(key))) {
        const validationResult = this.validateIngresoRecurrenteFields({ ...ingresoRecurrente.toJSON(), ...req.body });
        if (!validationResult.isValid) {
          await transaction.rollback();
          return sendError(res, 400, 'Campos inválidos', validationResult.message);
        }
      }

      // Limpiar datos del formulario
      const cleanData = this.cleanFormData(req.body);

      // 💱 Recalculate multi-currency if monto or moneda_origen changed
      if (cleanData.monto !== undefined || cleanData.moneda_origen !== undefined) {
        const monto = cleanData.monto || ingresoRecurrente.monto;
        const monedaOrigen = cleanData.moneda_origen || ingresoRecurrente.moneda_origen || 'ARS';

        try {
          const { monto_ars, monto_usd, tipo_cambio_usado } =
            await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

          cleanData.monto_ars = monto_ars;
          cleanData.monto_usd = monto_usd;
          cleanData.tipo_cambio_referencia = tipo_cambio_usado;

          logger.debug('Multi-currency recalculated for IngresoRecurrente update', {
            id: ingresoRecurrente.id, moneda_origen: monedaOrigen, monto, monto_ars, monto_usd
          });
        } catch (exchangeError) {
          logger.warn('Exchange rate conversion failed during IngresoRecurrente update', {
            error: exchangeError.message
          });
          cleanData.monto_ars = monto;
          cleanData.monto_usd = null;
        }
      }

      // Si se está actualizando el estado activo
      if (cleanData.activo !== undefined && cleanData.activo !== ingresoRecurrente.activo) {
        logger.info('Cambiando estado de ingreso recurrente:', {
          id: ingresoRecurrente.id,
          estado_anterior: ingresoRecurrente.activo,
          nuevo_estado: cleanData.activo
        });
      }

      await ingresoRecurrente.update(cleanData, { transaction });

      await transaction.commit();
      logger.info('Ingreso recurrente actualizado exitosamente:', { id: ingresoRecurrente.id });

      // Recargar con includes
      const updatedIngresoRecurrente = await this.model.findByPk(ingresoRecurrente.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedIngresoRecurrente);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al actualizar ingreso recurrente:', { error });
      return sendError(res, 500, 'Error al actualizar ingreso recurrente', error.message);
    }
  }

  // Eliminar ingreso recurrente
  async delete(req, res) {
    try {
      const ingresoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!ingresoRecurrente) {
        return sendError(res, 404, 'Ingreso recurrente no encontrado');
      }

      await ingresoRecurrente.destroy();

      logger.info('Ingreso recurrente eliminado exitosamente:', {
        ingresoRecurrente_id: req.params.id
      });

      return sendSuccess(res, {
        message: 'Ingreso recurrente eliminado correctamente'
      });
    } catch (error) {
      logger.error('Error al eliminar ingreso recurrente:', { error });
      return sendError(res, 500, 'Error al eliminar ingreso recurrente', error.message);
    }
  }

  // Helper para limpiar datos del formulario
  cleanFormData(body) {
    const cleaned = { ...body };

    // Convertir strings vacíos a null para campos opcionales
    if (cleaned.mes_de_pago === '' || cleaned.mes_de_pago === undefined) {
      cleaned.mes_de_pago = null;
    }
    if (cleaned.fecha_inicio === '' || cleaned.fecha_inicio === undefined) {
      cleaned.fecha_inicio = null;
    }
    if (cleaned.fecha_fin === '' || cleaned.fecha_fin === undefined) {
      cleaned.fecha_fin = null;
    }

    // Asegurar tipos numéricos correctos
    if (cleaned.monto) cleaned.monto = parseFloat(cleaned.monto);
    if (cleaned.dia_de_pago) cleaned.dia_de_pago = parseInt(cleaned.dia_de_pago);
    if (cleaned.mes_de_pago) cleaned.mes_de_pago = parseInt(cleaned.mes_de_pago);
    if (cleaned.fuente_ingreso_id) cleaned.fuente_ingreso_id = parseInt(cleaned.fuente_ingreso_id);
    if (cleaned.frecuencia_gasto_id) cleaned.frecuencia_gasto_id = parseInt(cleaned.frecuencia_gasto_id);

    // Manejar checkbox de activo
    if (cleaned.activo === 'on') cleaned.activo = true;
    if (cleaned.activo === '' || cleaned.activo === undefined || cleaned.activo === 'off') cleaned.activo = false;

    return cleaned;
  }

  // Validaciones específicas de IngresoRecurrente
  validateIngresoRecurrenteFields(data) {
    // Validaciones básicas
    if (!data.monto || !data.dia_de_pago || !data.frecuencia_gasto_id || !data.fuente_ingreso_id) {
      return {
        isValid: false,
        message: 'Los campos monto, dia_de_pago, frecuencia_gasto_id y fuente_ingreso_id son requeridos'
      };
    }

    // Validar rango del día
    if (data.dia_de_pago < 1 || data.dia_de_pago > 31) {
      return {
        isValid: false,
        message: 'El día de pago debe estar entre 1 y 31'
      };
    }

    // Validar mes_de_pago para frecuencia anual
    if (data.mes_de_pago !== null && data.mes_de_pago !== undefined) {
      if (data.mes_de_pago < 1 || data.mes_de_pago > 12) {
        return {
          isValid: false,
          message: 'El mes de pago debe estar entre 1 y 12'
        };
      }
    }

    return { isValid: true };
  }

  // Obtener ingresos recurrentes con filtros y paginación
  async getWithFilters(req, res) {
    try {
      const {
        fuente_ingreso_id,
        frecuencia_gasto_id,
        monto_min,
        monto_max,
        activo,
        dia_de_pago,
        mes_de_pago,
        limit,
        offset = 0,
        orderBy = 'created_at',
        orderDirection = 'DESC'
      } = req.query;

      // SIEMPRE filtrar por usuario autenticado
      const where = {
        usuario_id: req.user.id
      };

      // Filtros por IDs
      if (fuente_ingreso_id) where.fuente_ingreso_id = fuente_ingreso_id;
      if (frecuencia_gasto_id) where.frecuencia_gasto_id = frecuencia_gasto_id;

      // Filtro por estado activo
      if (activo !== undefined) where.activo = activo === 'true';

      // Filtros específicos de ingresos recurrentes
      if (dia_de_pago) where.dia_de_pago = dia_de_pago;
      if (mes_de_pago) where.mes_de_pago = mes_de_pago;

      // Filtro por rango de montos
      if (monto_min || monto_max) {
        where.monto = {};
        if (monto_min) where.monto[Op.gte] = Number(monto_min);
        if (monto_max) where.monto[Op.lte] = Number(monto_max);
      }

      const queryOptions = {
        where,
        include: this.getIncludes(),
        order: [[orderBy, orderDirection]]
      };

      if (limit) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);

        const ingresosRecurrentes = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: ingresosRecurrentes.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < ingresosRecurrentes.count,
          hasPrev: parseInt(offset) > 0
        };

        return sendPaginatedSuccess(res, ingresosRecurrentes.rows, pagination);
      } else {
        const ingresosRecurrentes = await this.model.findAll(queryOptions);
        return sendSuccess(res, ingresosRecurrentes);
      }
    } catch (error) {
      logger.error('Error al obtener ingresos recurrentes con filtros:', { error });
      return sendError(res, 500, 'Error al obtener ingresos recurrentes', error.message);
    }
  }

  // Toggle activo status
  async toggleActivo(req, res) {
    try {
      const ingresoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });

      if (!ingresoRecurrente) {
        return sendError(res, 404, 'Ingreso recurrente no encontrado');
      }

      const newStatus = !ingresoRecurrente.activo;
      await ingresoRecurrente.update({ activo: newStatus });

      logger.info(`Ingreso recurrente ${newStatus ? 'activado' : 'desactivado'}:`, {
        id: ingresoRecurrente.id,
        descripcion: ingresoRecurrente.descripcion
      });

      const updatedIngreso = await this.model.findByPk(ingresoRecurrente.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedIngreso);
    } catch (error) {
      logger.error('Error al cambiar estado de ingreso recurrente:', { error });
      return sendError(res, 500, 'Error al cambiar estado', error.message);
    }
  }
}

// Crear instancia del controlador
const ingresoRecurrenteController = new IngresoRecurrenteController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerIngresoRecurrentePorId = ingresoRecurrenteController.getById.bind(ingresoRecurrenteController);
export const obtenerIngresosRecurrentesConFiltros = ingresoRecurrenteController.getWithFilters.bind(ingresoRecurrenteController);
export const crearIngresoRecurrente = ingresoRecurrenteController.create.bind(ingresoRecurrenteController);
export const actualizarIngresoRecurrente = ingresoRecurrenteController.update.bind(ingresoRecurrenteController);
export const eliminarIngresoRecurrente = ingresoRecurrenteController.delete.bind(ingresoRecurrenteController);
export const toggleActivoIngresoRecurrente = ingresoRecurrenteController.toggleActivo.bind(ingresoRecurrenteController);
