import { BaseController } from './base.controller.js';
import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

export class DebitoAutomaticoController extends BaseController {
  constructor() {
    super(DebitoAutomatico, 'Débito Automático');
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

      // Validar campos específicos de DebitoAutomatico
      const validationResult = this.validateDebitoAutomaticoFields(req.body);
      if (!validationResult.isValid) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', validationResult.message);
      }

      // 💱 Calculate multi-currency fields
      const monto = req.body.monto;
      const monedaOrigen = req.body.moneda_origen || 'ARS';

      let debitoData = {
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

        debitoData = {
          ...debitoData,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado  // Note: 'referencia' for debitos
        };

        logger.debug('Multi-currency conversion applied to DebitoAutomatico', {
          moneda_origen: monedaOrigen,
          monto,
          monto_ars,
          monto_usd,
          tipo_cambio_referencia: tipo_cambio_usado
        });
      } catch (exchangeError) {
        logger.warn('Exchange rate conversion failed for DebitoAutomatico', {
          error: exchangeError.message
        });
        debitoData.monto_ars = monto;
        debitoData.monto_usd = null;
      }

      // 1. Crear el débito automático
      const debitoAutomatico = await this.model.create(debitoData, {
        transaction,
        include: [{ model: FrecuenciaGasto, as: 'frecuencia' }]
      });

      // 2. Recargar con includes para tener frecuencia disponible
      const debitoAutomaticoCompleto = await this.model.findByPk(debitoAutomatico.id, {
        include: this.getIncludes(),
        transaction
      });

      // 3. La generación de gastos se hará vía job diario (business rule)
      // No generar gasto inmediatamente para éviter problemas de transacciones
      const gasto = null;

      await transaction.commit();
      logger.info('Débito automático creado exitosamente:', {
        debitoAutomatico_id: debitoAutomatico.id,
        gasto_id: gasto?.id,
        primera_generacion: !!gasto
      });

      return sendSuccess(res, { debitoAutomatico: debitoAutomaticoCompleto, gasto }, 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al crear débito automático:', { error });
      return sendError(res, 500, 'Error al crear débito automático', error.message);
    }
  }

  // Método update mejorado: solo actualiza DebitoAutomatico (business rule: cambios no afectan gastos ya generados)
  async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const debitoAutomatico = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!debitoAutomatico) {
        await transaction.rollback();
        return sendError(res, 404, 'Débito automático no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos si se están actualizando
      if (Object.keys(req.body).some(key => ['monto', 'dia_de_pago', 'mes_de_pago', 'frecuencia_gasto_id'].includes(key))) {
        const validationResult = this.validateDebitoAutomaticoFields({ ...debitoAutomatico.toJSON(), ...req.body });
        if (!validationResult.isValid) {
          await transaction.rollback();
          return sendError(res, 400, 'Campos inválidos', validationResult.message);
        }
      }

      // Limpiar datos del formulario (similar a GastoRecurrente)
      const cleanData = this.cleanFormData(req.body);

      // 💱 Recalculate multi-currency if monto or moneda_origen changed
      if (cleanData.monto !== undefined || cleanData.moneda_origen !== undefined) {
        const monto = cleanData.monto || debitoAutomatico.monto;
        const monedaOrigen = cleanData.moneda_origen || debitoAutomatico.moneda_origen || 'ARS';

        try {
          const { monto_ars, monto_usd, tipo_cambio_usado } =
            await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

          cleanData.monto_ars = monto_ars;
          cleanData.monto_usd = monto_usd;
          cleanData.tipo_cambio_referencia = tipo_cambio_usado;

          logger.debug('Multi-currency recalculated for DebitoAutomatico update', {
            id: debitoAutomatico.id, moneda_origen: monedaOrigen, monto, monto_ars, monto_usd
          });
        } catch (exchangeError) {
          logger.warn('Exchange rate conversion failed during DebitoAutomatico update', {
            error: exchangeError.message
          });
          cleanData.monto_ars = monto;
          cleanData.monto_usd = null;
        }
      }

      // Si se está actualizando el estado activo
      if (cleanData.activo !== undefined && cleanData.activo !== debitoAutomatico.activo) {
        logger.info('Cambiando estado de débito automático:', {
          id: debitoAutomatico.id,
          estado_anterior: debitoAutomatico.activo,
          nuevo_estado: cleanData.activo
        });
      }

      // ✅ BUSINESS RULE: Solo actualizar DebitoAutomatico, NO los gastos ya generados
      await debitoAutomatico.update(cleanData, { transaction });

      await transaction.commit();
      logger.info('Débito automático actualizado exitosamente:', { id: debitoAutomatico.id });

      // Recargar con includes
      const updatedDebitoAutomatico = await this.model.findByPk(debitoAutomatico.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedDebitoAutomatico);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al actualizar débito automático:', { error });
      return sendError(res, 500, 'Error al actualizar débito automático', error.message);
    }
  }

  // Método delete mejorado: preserva gastos ya generados (business rule)
  async delete(req, res) {
    try {
      const debitoAutomatico = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!debitoAutomatico) {
        return sendError(res, 404, 'Débito automático no encontrado');
      }

      // ✅ BUSINESS RULE: Solo eliminar DebitoAutomatico, NO los Gastos generados
      await debitoAutomatico.destroy();

      logger.info('Débito automático eliminado exitosamente:', {
        debitoAutomatico_id: req.params.id
      });

      return sendSuccess(res, {
        message: 'Débito automático eliminado correctamente',
        nota: 'Los gastos ya generados se mantienen como histórico'
      });
    } catch (error) {
      logger.error('Error al eliminar débito automático:', { error });
      return sendError(res, 500, 'Error al eliminar débito automático', error.message);
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

  // Validaciones específicas de DebitoAutomatico con soporte para mes_de_pago
  validateDebitoAutomaticoFields(data) {
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

  // Método para obtener débitos automáticos con filtros y paginación inteligente
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

      // Filtro específico de débitos automáticos
      if (dia_de_pago) where.dia_de_pago = dia_de_pago;

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

        const debitosAutomaticos = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: debitosAutomaticos.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < debitosAutomaticos.count,
          hasPrev: parseInt(offset) > 0
        };

        return sendPaginatedSuccess(res, debitosAutomaticos.rows, pagination);
      } else {
        const debitosAutomaticos = await this.model.findAll(queryOptions);
        return sendSuccess(res, debitosAutomaticos);
      }
    } catch (error) {
      logger.error('Error al obtener débitos automáticos con filtros:', { error });
      return sendError(res, 500, 'Error al obtener débitos automáticos', error.message);
    }
  }
}

// Crear instancia del controlador
const debitoAutomaticoController = new DebitoAutomaticoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerDebitoAutomaticoPorId = debitoAutomaticoController.getById.bind(debitoAutomaticoController);
export const obtenerDebitosAutomaticosConFiltros = debitoAutomaticoController.getWithFilters.bind(debitoAutomaticoController);
export const crearDebitoAutomatico = debitoAutomaticoController.create.bind(debitoAutomaticoController);
export const actualizarDebitoAutomatico = debitoAutomaticoController.update.bind(debitoAutomaticoController);
export const eliminarDebitoAutomatico = debitoAutomaticoController.delete.bind(debitoAutomaticoController);
