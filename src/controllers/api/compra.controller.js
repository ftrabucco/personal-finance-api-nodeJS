import { BaseController } from './base.controller.js';
import { Compra, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, Gasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import { ExchangeRateService } from '../../services/exchangeRate.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';
import { cleanEntityFormData } from '../../utils/formDataHelper.js';
import { FilterBuilder, buildQueryOptions, buildPagination } from '../../utils/filterBuilder.js';

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

      let compraData = {
        ...req.body,
        usuario_id: req.user.id,
        pendiente_cuotas: true,
        moneda_origen: monedaOrigen
      };

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

      // 3. Intentar generar primer gasto si corresponde (business rule: compras de 1 cuota se generan inmediatamente)
      let gasto = null;
      if (compra.cantidad_cuotas === 1 || compra.cantidad_cuotas === null) {
        try {
          gasto = await GastoGeneratorService.generateFromCompra(compraCompleta);
        } catch (error) {
          logger.warn('No se pudo generar gasto inmediato para compra:', {
            compra_id: compra.id,
            error: error.message
          });
        }
      }

      await transaction.commit();
      logger.info('Compra creada exitosamente:', {
        compra_id: compra.id,
        gasto_id: gasto?.id,
        primera_generacion: !!gasto,
        es_cuotas: compra.cantidad_cuotas > 1
      });

      return sendSuccess(res, { compra: compraCompleta, gasto }, 201);
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
        return sendPaginatedSuccess(res, compras.rows, pagination);
      } else {
        const compras = await this.model.findAll(queryOptions);
        return sendSuccess(res, compras);
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
