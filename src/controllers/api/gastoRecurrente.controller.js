import { BaseController } from './base.controller.js';
import { GastoRecurrente, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

export class GastoRecurrenteController extends BaseController {
  constructor() {
    super(GastoRecurrente, 'Gasto Recurrente');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' },
      { model: FrecuenciaGasto, as: 'frecuencia' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' },
      frecuencia_gasto_id: { model: FrecuenciaGasto, name: 'Frecuencia' }
    };
  }

  // Método create mejorado: transaccional y con validación de mes_de_pago para anual
  async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de GastoRecurrente
      const validationResult = this.validateGastoRecurrenteFields(req.body);
      if (!validationResult.isValid) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', validationResult.message);
      }

      // 💱 Calculate multi-currency fields
      const monto = req.body.monto;
      const monedaOrigen = req.body.moneda_origen || 'ARS';

      let gastoData = {
        ...req.body,
        usuario_id: req.user.id,
        activo: true,
        ultima_fecha_generado: null,
        moneda_origen: monedaOrigen
      };

      // Calculate monto_ars, monto_usd, tipo_cambio_referencia
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

        gastoData = {
          ...gastoData,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado  // Note: 'referencia' for recurring
        };

        logger.debug('Multi-currency conversion applied to GastoRecurrente', {
          moneda_origen: monedaOrigen,
          monto,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        });
      } catch (exchangeError) {
        logger.warn('Exchange rate conversion failed for GastoRecurrente', {
          error: exchangeError.message
        });
        gastoData.monto_ars = monto;
        gastoData.monto_usd = null;
      }

      // 1. Crear el gasto recurrente
      const gastoRecurrente = await this.model.create(gastoData, {
        transaction,
        include: [{ model: FrecuenciaGasto, as: 'frecuencia' }]
      });

      // 2. Recargar con includes para tener frecuencia disponible
      const gastoRecurrenteCompleto = await this.model.findByPk(gastoRecurrente.id, {
        include: this.getIncludes(),
        transaction
      });

      // 3. Intentar generar primer gasto si corresponde (business rule: job diario)
      const gasto = await GastoGeneratorService.generateFromGastoRecurrente(gastoRecurrenteCompleto);

      await transaction.commit();
      logger.info('Gasto recurrente creado exitosamente:', {
        gastoRecurrente_id: gastoRecurrente.id,
        gasto_id: gasto?.id,
        primera_generacion: !!gasto
      });

      return sendSuccess(res, { gastoRecurrente: gastoRecurrenteCompleto, gasto }, 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al crear gasto recurrente:', { error });
      return sendError(res, 500, 'Error al crear gasto recurrente', error.message);
    }
  }

  // Método update mejorado: solo actualiza GastoRecurrente (business rule: cambios no afectan gastos ya generados)
  async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const gastoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!gastoRecurrente) {
        await transaction.rollback();
        return sendError(res, 404, 'Gasto recurrente no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos si se están actualizando
      if (Object.keys(req.body).some(key => ['monto', 'dia_de_pago', 'mes_de_pago', 'frecuencia_gasto_id'].includes(key))) {
        const validationResult = this.validateGastoRecurrenteFields({ ...gastoRecurrente.toJSON(), ...req.body });
        if (!validationResult.isValid) {
          await transaction.rollback();
          return sendError(res, 400, 'Campos inválidos', validationResult.message);
        }
      }

      // Limpiar datos del formulario (similar a GastoUnico)
      const cleanData = this.cleanFormData(req.body);

      // Si se está actualizando el estado activo
      if (cleanData.activo !== undefined && cleanData.activo !== gastoRecurrente.activo) {
        logger.info('Cambiando estado de gasto recurrente:', {
          id: gastoRecurrente.id,
          estado_anterior: gastoRecurrente.activo,
          nuevo_estado: cleanData.activo
        });
      }

      // ✅ BUSINESS RULE: Solo actualizar GastoRecurrente, NO los gastos ya generados
      await gastoRecurrente.update(cleanData, { transaction });

      await transaction.commit();
      logger.info('Gasto recurrente actualizado exitosamente:', { id: gastoRecurrente.id });

      // Recargar con includes
      const updatedGastoRecurrente = await this.model.findByPk(gastoRecurrente.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedGastoRecurrente);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al actualizar gasto recurrente:', { error });
      return sendError(res, 500, 'Error al actualizar gasto recurrente', error.message);
    }
  }

  // Método delete mejorado: preserva gastos ya generados (business rule)
  async delete(req, res) {
    try {
      const gastoRecurrente = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!gastoRecurrente) {
        return sendError(res, 404, 'Gasto recurrente no encontrado');
      }

      // ✅ BUSINESS RULE: Solo eliminar GastoRecurrente, NO los Gastos generados
      await gastoRecurrente.destroy();

      logger.info('Gasto recurrente eliminado exitosamente:', {
        gastoRecurrente_id: req.params.id
      });

      return sendSuccess(res, {
        message: 'Gasto recurrente eliminado correctamente',
        nota: 'Los gastos ya generados se mantienen como histórico'
      });
    } catch (error) {
      logger.error('Error al eliminar gasto recurrente:', { error });
      return sendError(res, 500, 'Error al eliminar gasto recurrente', error.message);
    }
  }

  // Helper para limpiar datos del formulario
  cleanFormData(body) {
    const cleaned = { ...body };

    // Convertir strings vacíos a null para campos opcionales
    if (cleaned.tarjeta_id === '' || cleaned.tarjeta_id === undefined) {
      cleaned.tarjeta_id = null;
    }
    if (cleaned.mes_de_pago === '' || cleaned.mes_de_pago === undefined) {
      cleaned.mes_de_pago = null;
    }

    // Asegurar tipos numéricos correctos
    if (cleaned.monto) cleaned.monto = parseFloat(cleaned.monto);
    if (cleaned.dia_de_pago) cleaned.dia_de_pago = parseInt(cleaned.dia_de_pago);
    if (cleaned.mes_de_pago) cleaned.mes_de_pago = parseInt(cleaned.mes_de_pago);
    if (cleaned.categoria_gasto_id) cleaned.categoria_gasto_id = parseInt(cleaned.categoria_gasto_id);
    if (cleaned.importancia_gasto_id) cleaned.importancia_gasto_id = parseInt(cleaned.importancia_gasto_id);
    if (cleaned.tipo_pago_id) cleaned.tipo_pago_id = parseInt(cleaned.tipo_pago_id);
    if (cleaned.frecuencia_gasto_id) cleaned.frecuencia_gasto_id = parseInt(cleaned.frecuencia_gasto_id);
    if (cleaned.tarjeta_id) cleaned.tarjeta_id = parseInt(cleaned.tarjeta_id);

    // Manejar checkbox de activo
    if (cleaned.activo === 'on') cleaned.activo = true;
    if (cleaned.activo === '' || cleaned.activo === undefined || cleaned.activo === 'off') cleaned.activo = false;

    return cleaned;
  }

  // Validaciones específicas de GastoRecurrente con soporte para mes_de_pago
  validateGastoRecurrenteFields(data) {
    // Validaciones básicas
    if (!data.monto || !data.dia_de_pago || !data.frecuencia_gasto_id) {
      return {
        isValid: false,
        message: 'Los campos monto, dia_de_pago y frecuencia_gasto_id son requeridos'
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

  // Método para obtener gastos recurrentes con filtros y paginación inteligente
  async getWithFilters(req, res) {
    try {
      const {
        categoria_gasto_id,
        importancia_gasto_id,
        tipo_pago_id,
        tarjeta_id,
        frecuencia_gasto_id,
        monto_min,
        monto_max,
        activo,
        dia_de_pago,
        mes_de_pago,
        limit,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'DESC'
      } = req.query;

      // SIEMPRE filtrar por usuario autenticado
      const where = {
        usuario_id: req.user.id
      };

      // Filtros por IDs
      if (categoria_gasto_id) where.categoria_gasto_id = categoria_gasto_id;
      if (importancia_gasto_id) where.importancia_gasto_id = importancia_gasto_id;
      if (tipo_pago_id) where.tipo_pago_id = tipo_pago_id;
      if (tarjeta_id) where.tarjeta_id = tarjeta_id;
      if (frecuencia_gasto_id) where.frecuencia_gasto_id = frecuencia_gasto_id;

      // Filtro por estado activo
      if (activo !== undefined) where.activo = activo === 'true';

      // Filtros específicos de gastos recurrentes
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

        const gastosRecurrentes = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: gastosRecurrentes.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < gastosRecurrentes.count,
          hasPrev: parseInt(offset) > 0
        };

        return sendPaginatedSuccess(res, gastosRecurrentes.rows, pagination);
      } else {
        const gastosRecurrentes = await this.model.findAll(queryOptions);
        return sendSuccess(res, gastosRecurrentes);
      }
    } catch (error) {
      logger.error('Error al obtener gastos recurrentes con filtros:', { error });
      return sendError(res, 500, 'Error al obtener gastos recurrentes', error.message);
    }
  }
}

// Crear instancia del controlador
const gastoRecurrenteController = new GastoRecurrenteController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerGastoRecurrentePorId = gastoRecurrenteController.getById.bind(gastoRecurrenteController);
export const obtenerGastosRecurrentesConFiltros = gastoRecurrenteController.getWithFilters.bind(gastoRecurrenteController);
export const crearGastoRecurrente = gastoRecurrenteController.create.bind(gastoRecurrenteController);
export const actualizarGastoRecurrente = gastoRecurrenteController.update.bind(gastoRecurrenteController);
export const eliminarGastoRecurrente = gastoRecurrenteController.delete.bind(gastoRecurrenteController);
