import { BaseController } from './base.controller.js';
import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { getDefaultFechaInicio, getFechaInicioForCurrentMonth } from '../../utils/dateHelper.js';
import { cleanEntityFormData } from '../../utils/formDataHelper.js';
import { FilterBuilder, buildQueryOptions, buildPagination } from '../../utils/filterBuilder.js';

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

      // Calcular fecha_inicio por defecto si no se proporcionó
      if (!debitoData.fecha_inicio) {
        if (debitoData.generar_mes_actual) {
          // Si pidió generar el mes actual, setear al dia_de_pago de este mes para catch-up
          debitoData.fecha_inicio = getFechaInicioForCurrentMonth(parseInt(debitoData.dia_de_pago));
        } else {
          debitoData.fecha_inicio = getDefaultFechaInicio();
        }
        logger.debug('Default fecha_inicio calculada para DebitoAutomatico', {
          dia_de_pago: debitoData.dia_de_pago,
          fecha_inicio: debitoData.fecha_inicio,
          generar_mes_actual: !!debitoData.generar_mes_actual
        });
      }
      // Limpiar campo auxiliar que no va a la DB
      delete debitoData.generar_mes_actual;

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

      // Limpiar datos del formulario usando helper centralizado
      const cleanData = cleanEntityFormData(req.body, 'debitoAutomatico');

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
        categoria_gasto_id, importancia_gasto_id, tipo_pago_id, tarjeta_id,
        frecuencia_gasto_id, monto_min, monto_max, activo, dia_de_pago,
        limit, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC'
      } = req.query;

      // Construir filtros usando FilterBuilder
      const where = new FilterBuilder(req.user.id)
        .addOptionalIds({
          categoria_gasto_id, importancia_gasto_id, tipo_pago_id,
          tarjeta_id, frecuencia_gasto_id, dia_de_pago
        })
        .addBoolean('activo', activo)
        .addNumberRange('monto', monto_min, monto_max)
        .build();

      const queryOptions = buildQueryOptions({
        where,
        includes: this.getIncludes(),
        orderBy, orderDirection, limit, offset
      });

      if (limit) {
        const debitosAutomaticos = await this.model.findAndCountAll(queryOptions);
        const pagination = buildPagination(debitosAutomaticos.count, limit, offset);
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

  // Método para procesar un débito automático individual para el mes actual
  // Útil cuando se crea un débito después del día de pago del mes
  async procesarMesActual(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const debitoAutomatico = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        },
        include: this.getIncludes()
      });

      if (!debitoAutomatico) {
        await transaction.rollback();
        return sendError(res, 404, 'Débito automático no encontrado');
      }

      if (!debitoAutomatico.activo) {
        await transaction.rollback();
        return sendError(res, 400, 'El débito automático está inactivo');
      }

      // Verificar si ya se generó este mes
      const today = new Date();
      const primerDiaMes = new Date(today.getFullYear(), today.getMonth(), 1);

      if (debitoAutomatico.ultima_fecha_generado) {
        const ultimaFecha = new Date(debitoAutomatico.ultima_fecha_generado);
        if (ultimaFecha >= primerDiaMes) {
          await transaction.rollback();
          return sendSuccess(res, {
            summary: {
              total_generated: 0,
              total_errors: 0,
              type: 'debito_automatico_individual'
            },
            details: {
              success: [],
              errors: []
            },
            message: 'El débito ya fue procesado para este mes'
          });
        }
      }

      // Generar el gasto para el mes actual
      const gasto = await GastoGeneratorService.generateFromDebitoAutomatico(debitoAutomatico);

      await transaction.commit();

      logger.info('Débito automático procesado manualmente para mes actual:', {
        debitoAutomatico_id: debitoAutomatico.id,
        gasto_id: gasto?.id,
        descripcion: debitoAutomatico.descripcion
      });

      return sendSuccess(res, {
        summary: {
          total_generated: gasto ? 1 : 0,
          total_errors: 0,
          type: 'debito_automatico_individual',
          breakdown: {
            debitos_automaticos: {
              generated: gasto ? 1 : 0,
              errors: 0
            }
          }
        },
        details: {
          success: gasto ? [{
            type: 'debito_automatico',
            id: debitoAutomatico.id,
            descripcion: debitoAutomatico.descripcion,
            gasto_id: gasto.id,
            timestamp: new Date().toISOString()
          }] : [],
          errors: []
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al procesar débito automático para mes actual:', { error });
      return sendError(res, 500, 'Error al procesar débito automático', error.message);
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
export const procesarDebitoAutomaticoMesActual = debitoAutomaticoController.procesarMesActual.bind(debitoAutomaticoController);
