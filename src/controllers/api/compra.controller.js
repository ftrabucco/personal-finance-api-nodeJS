import { BaseController } from './base.controller.js';
import { Compra, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, Gasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { fn, col } from 'sequelize';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { cleanEntityFormData } from '../../utils/formDataHelper.js';
import { FilterBuilder, buildQueryOptions, buildPagination } from '../../utils/filterBuilder.js';
import { InstallmentExpenseStrategy } from '../../strategies/expenseGeneration/installmentStrategy.js';

export class CompraController extends BaseController {
  constructor() {
    super(Compra, 'Compra');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' }
    };
  }

  // Método create mejorado: transaccional con generación automática de primer gasto
  async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de Compra
      const validationResult = this.validateCompraFields(req.body);
      if (!validationResult.isValid) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', validationResult.message);
      }

      // 💱 Calculate multi-currency fields
      const montoTotal = req.body.monto_total;
      const monedaOrigen = req.body.moneda_origen || 'ARS';

      const cuotasPagadas = req.body.cuotas_pagadas || 0;

      let compraData = {
        ...req.body,
        usuario_id: req.user.id,
        pendiente_cuotas: true,
        moneda_origen: monedaOrigen
      };

      // Eliminar cuotas_pagadas de compraData - no es columna del modelo Compra
      delete compraData.cuotas_pagadas;

      // Calculate monto_total_ars, monto_total_usd, tipo_cambio_usado
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await ExchangeRateService.calculateBothCurrencies(montoTotal, monedaOrigen);

        compraData = {
          ...compraData,
          monto_total_ars: monto_ars,
          monto_total_usd: monto_usd,
          tipo_cambio_usado
        };

        logger.debug('Multi-currency conversion applied to Compra', {
          moneda_origen: monedaOrigen,
          monto_total: montoTotal,
          monto_total_ars: monto_ars,
          monto_total_usd: monto_usd,
          tipo_cambio_usado
        });
      } catch (exchangeError) {
        logger.warn('Exchange rate conversion failed for Compra', {
          error: exchangeError.message
        });
        // Fallback: assume ARS
        compraData.monto_total_ars = montoTotal;
        compraData.monto_total_usd = null;
      }

      // 1. Crear la compra - siempre marcar como pendiente inicialmente
      const compra = await this.model.create(compraData, { transaction });

      // 2. Recargar con includes para tener datos completos
      const compraCompleta = await this.model.findByPk(compra.id, {
        include: this.getIncludes(),
        transaction
      });

      // 3. Generar gastos según cuotas_pagadas
      let gasto = null;
      let gastosHistoricos = [];

      if (cuotasPagadas > 0) {
        // Generar gastos históricos para cuotas ya pagadas
        const installmentStrategy = new InstallmentExpenseStrategy();
        const result = await installmentStrategy.generateHistoricalInstallments(compraCompleta, cuotasPagadas, transaction);
        gastosHistoricos = result.gastos;

        // Actualizar estado de la compra
        const cantidadCuotas = compraCompleta.cantidad_cuotas || 1;
        const updateData = {
          fecha_ultima_cuota_generada: result.lastDate
        };

        if (cuotasPagadas >= cantidadCuotas) {
          updateData.pendiente_cuotas = false;
        }

        await compraCompleta.update(updateData, { transaction });

        logger.info('Cuotas históricas generadas:', {
          compra_id: compra.id,
          cuotas_pagadas: cuotasPagadas,
          gastos_generados: gastosHistoricos.length,
          completamente_pagada: cuotasPagadas >= cantidadCuotas
        });
      } else if (compra.cantidad_cuotas === 1 || compra.cantidad_cuotas === null) {
        // Compras de 1 cuota con tarjeta de crédito: no generar inmediatamente,
        // el scheduler lo genera cuando llega la fecha de vencimiento de la tarjeta
        const isCreditCard = compraCompleta.tarjeta_id && compraCompleta.tarjeta?.tipo === 'credito';
        if (!isCreditCard) {
          try {
            gasto = await GastoGeneratorService.generateFromCompra(compraCompleta);
          } catch (error) {
            logger.warn('No se pudo generar gasto inmediato para compra:', {
              compra_id: compra.id,
              error: error.message
            });
          }
        } else {
          logger.info('Compra con tarjeta de crédito - gasto se generará en fecha de vencimiento:', {
            compra_id: compra.id,
            tarjeta_id: compraCompleta.tarjeta_id
          });
        }
      }

      await transaction.commit();
      logger.info('Compra creada exitosamente:', {
        compra_id: compra.id,
        gasto_id: gasto?.id,
        primera_generacion: !!gasto,
        cuotas_pagadas: cuotasPagadas,
        es_cuotas: compra.cantidad_cuotas > 1
      });

      return sendSuccess(res, {
        compra: compraCompleta,
        gasto,
        gastos_historicos: gastosHistoricos.length > 0 ? gastosHistoricos : undefined
      }, 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al crear compra:', { error });
      return sendError(res, 500, 'Error al crear compra', error.message);
    }
  }

  // Método update mejorado: transaccional con validación de cuotas existentes
  async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const compra = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!compra) {
        await transaction.rollback();
        return sendError(res, 404, 'Compra no encontrada');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Si se está actualizando el número de cuotas, validar con gastos existentes
      if (req.body.cantidad_cuotas !== undefined &&
          req.body.cantidad_cuotas !== compra.cantidad_cuotas) {
        const validationResult = await this.validateCuotasUpdate(req.body.cantidad_cuotas, compra);
        if (!validationResult.isValid) {
          await transaction.rollback();
          return sendError(res, 400, 'Actualización de cuotas inválida', validationResult.message);
        }
      }

      // Limpiar datos del formulario usando helper centralizado
      const cleanData = cleanEntityFormData(req.body, 'compra');

      // ✅ BUSINESS RULE: Solo actualizar Compra, NO los gastos ya generados
      await compra.update(cleanData, { transaction });

      await transaction.commit();
      logger.info('Compra actualizada exitosamente:', { id: compra.id });

      // Recargar con includes
      const updatedCompra = await this.model.findByPk(compra.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedCompra);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al actualizar compra:', { error });
      return sendError(res, 500, 'Error al actualizar compra', error.message);
    }
  }

  // Método delete mejorado: preserva gastos ya generados (business rule)
  async delete(req, res) {
    try {
      const compra = await this.model.findOne({
        where: {
          id: req.params.id,
          usuario_id: req.user.id
        }
      });
      if (!compra) {
        return sendError(res, 404, 'Compra no encontrada');
      }

      // ✅ BUSINESS RULE: Solo eliminar Compra, NO los Gastos generados
      await compra.destroy();

      logger.info('Compra eliminada exitosamente:', {
        compra_id: req.params.id
      });

      return sendSuccess(res, {
        message: 'Compra eliminada correctamente',
        nota: 'Los gastos ya generados se mantienen como histórico'
      });
    } catch (error) {
      logger.error('Error al eliminar compra:', { error });
      return sendError(res, 500, 'Error al eliminar compra', error.message);
    }
  }

  // Validaciones específicas de Compra mejoradas
  validateCompraFields(data) {
    // Validaciones básicas
    if (!data.monto_total || !data.fecha_compra) {
      return {
        isValid: false,
        message: 'Los campos monto_total y fecha_compra son requeridos'
      };
    }

    // Validar cantidad de cuotas
    if (data.cantidad_cuotas && (data.cantidad_cuotas < 1 || data.cantidad_cuotas > 60)) {
      return {
        isValid: false,
        message: 'La cantidad de cuotas debe estar entre 1 y 60'
      };
    }

    // Validar que la fecha no sea futura
    if (new Date(data.fecha_compra) > new Date()) {
      return {
        isValid: false,
        message: 'La fecha de compra no puede ser futura'
      };
    }

    // Validar cuotas pagadas vs cantidad de cuotas
    if (data.cuotas_pagadas > 0) {
      const cantidadCuotas = data.cantidad_cuotas || 1;
      if (data.cuotas_pagadas > cantidadCuotas) {
        return {
          isValid: false,
          message: 'Las cuotas pagadas no pueden superar la cantidad total de cuotas'
        };
      }
    }

    return { isValid: true };
  }

  async validateCuotasUpdate(newCuotas, compra) {
    // Contar gastos ya generados para esta compra
    const gastosGenerados = await Gasto.count({
      where: {
        tipo_origen: 'compra',
        id_origen: compra.id
      }
    });

    // Si se están reduciendo las cuotas, verificar que no haya más gastos generados
    if (newCuotas < compra.cantidad_cuotas) {
      if (gastosGenerados > newCuotas) {
        return {
          isValid: false,
          message: `No se puede reducir a ${newCuotas} cuotas porque ya se generaron ${gastosGenerados} gastos`
        };
      }
    }

    return { isValid: true };
  }

  // Enrich compras with cuotas_pagadas count from Gasto table
  async enrichWithCuotasPagadas(compras) {
    const compraIds = compras.map(c => c.id || c.get?.('id'));
    if (compraIds.length === 0) return compras;

    const cuotasCounts = await Gasto.findAll({
      attributes: [
        'id_origen',
        [fn('COUNT', col('id')), 'cuotas_pagadas']
      ],
      where: { tipo_origen: 'compra', id_origen: compraIds },
      group: ['id_origen'],
      raw: true
    });

    const cuotasMap = new Map(cuotasCounts.map(c => [c.id_origen, parseInt(c.cuotas_pagadas)]));

    return compras.map(compra => {
      const plain = typeof compra.get === 'function' ? compra.get({ plain: true }) : compra;
      plain.cuotas_pagadas = cuotasMap.get(plain.id) || 0;
      return plain;
    });
  }

  async getAll(req, res) {
    try {
      const compras = await this.model.findAll({
        where: { usuario_id: req.user.id },
        include: this.getIncludes(),
        order: [['fecha_compra', 'DESC']]
      });

      const enriched = await this.enrichWithCuotasPagadas(compras);
      return sendSuccess(res, enriched);
    } catch (error) {
      logger.error('Error al obtener compras:', { error });
      return sendError(res, 500, 'Error al obtener compras', error.message);
    }
  }

  async getById(req, res) {
    try {
      const compra = await this.model.findOne({
        where: { id: req.params.id, usuario_id: req.user.id },
        include: this.getIncludes()
      });

      if (!compra) {
        return sendError(res, 404, 'Compra no encontrada');
      }

      const [enriched] = await this.enrichWithCuotasPagadas([compra]);
      return sendSuccess(res, enriched);
    } catch (error) {
      logger.error('Error al obtener compra:', { error });
      return sendError(res, 500, 'Error al obtener compra', error.message);
    }
  }

  // Método para obtener compras con filtros y paginación inteligente
  async getWithFilters(req, res) {
    try {
      const {
        categoria_gasto_id, importancia_gasto_id, tipo_pago_id, tarjeta_id,
        fecha_desde, fecha_hasta, monto_min, monto_max,
        pendiente_cuotas, cuotas_min, cuotas_max,
        limit, offset = 0, orderBy = 'fecha_compra', orderDirection = 'DESC'
      } = req.query;

      // Construir filtros usando FilterBuilder
      const where = new FilterBuilder(req.user.id)
        .addOptionalIds({ categoria_gasto_id, importancia_gasto_id, tipo_pago_id, tarjeta_id })
        .addBoolean('pendiente_cuotas', pendiente_cuotas)
        .addDateRange('fecha_compra', fecha_desde, fecha_hasta)
        .addNumberRange('monto_total', monto_min, monto_max)
        .addNumberRange('cantidad_cuotas', cuotas_min, cuotas_max)
        .build();

      const queryOptions = buildQueryOptions({
        where,
        includes: this.getIncludes(),
        orderBy, orderDirection, limit, offset
      });

      if (limit) {
        const compras = await this.model.findAndCountAll(queryOptions);
        const pagination = buildPagination(compras.count, limit, offset);
        const enriched = await this.enrichWithCuotasPagadas(compras.rows);
        return sendPaginatedSuccess(res, enriched, pagination);
      } else {
        const compras = await this.model.findAll(queryOptions);
        const enriched = await this.enrichWithCuotasPagadas(compras);
        return sendSuccess(res, enriched);
      }
    } catch (error) {
      logger.error('Error al obtener compras con filtros:', { error });
      return sendError(res, 500, 'Error al obtener compras', error.message);
    }
  }
}

// Crear instancia del controlador
const compraController = new CompraController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerCompraPorId = compraController.getById.bind(compraController);
export const obtenerComprasConFiltros = compraController.getWithFilters.bind(compraController);
export const crearCompra = compraController.create.bind(compraController);
export const actualizarCompra = compraController.update.bind(compraController);
export const eliminarCompra = compraController.delete.bind(compraController);
