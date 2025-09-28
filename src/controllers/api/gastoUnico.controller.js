import { BaseController } from './base.controller.js';
import { GastoUnico, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { GastoUnicoService } from '../../services/gastoUnico.service.js';
import sequelize from '../../db/postgres.js';
import { sendError, sendSuccess, sendPaginatedSuccess, sendValidationError } from '../../utils/responseHelper.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

export class GastoUnicoController extends BaseController {
  constructor() {
    super(GastoUnico, 'Gasto Único');
    this.gastoUnicoService = new GastoUnicoService();
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

  // Método create mejorado: transaccional y sincronizado según business rules
  async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos de GastoUnico
      if (!this.validateGastoUnicoFields(req.body)) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', 'Los campos monto y fecha son requeridos');
      }

      // Normalizar fecha (YYYY-MM-DD)
      const fechaParaBD = new Date(req.body.fecha).toISOString().split('T')[0];
      
      // Crear gasto único y gasto real de forma transaccional usando el servicio
      // Agregar usuario_id del usuario autenticado
      const gastoUnico = await this.gastoUnicoService.createForUser({
        ...req.body,
        fecha: fechaParaBD
      }, req.user.id, transaction);

      await transaction.commit();
      logger.info('Gasto único creado exitosamente:', { gastoUnico_id: gastoUnico.id });

      return sendSuccess(res, gastoUnico, 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al crear gasto único:', { error });
      return sendError(res, 500, 'Error al crear gasto único', error.message);
    }
  }

  // Método update mejorado: actualiza AMBAS tablas según business rules
  async update(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Buscar el gasto único que pertenece al usuario autenticado
      const gastoUnico = await this.gastoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!gastoUnico) {
        await transaction.rollback();
        return sendError(res, 404, 'Gasto único no encontrado');
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return sendValidationError(res, validationErrors);
      }

      // Validar campos específicos si se están actualizando
      if (req.body.fecha && !this.validateGastoUnicoFields(req.body)) {
        await transaction.rollback();
        return sendError(res, 400, 'Campos inválidos', 'La fecha es requerida y debe ser válida');
      }

      // Normalizar fecha si se está actualizando
      const updateData = { ...req.body };
      if (updateData.fecha) {
        updateData.fecha = new Date(updateData.fecha).toISOString().split('T')[0];
      }

      // 1. Actualizar gasto único
      await gastoUnico.update(updateData, { transaction });

      // 2. Actualizar gasto asociado (business rule: actualizar AMBAS tablas)
      const gastoUpdateData = {};
      if (updateData.fecha) gastoUpdateData.fecha = updateData.fecha;
      if (updateData.monto) gastoUpdateData.monto_ars = updateData.monto;
      if (updateData.descripcion) gastoUpdateData.descripcion = updateData.descripcion;
      if (updateData.categoria_gasto_id) gastoUpdateData.categoria_gasto_id = updateData.categoria_gasto_id;
      if (updateData.importancia_gasto_id) gastoUpdateData.importancia_gasto_id = updateData.importancia_gasto_id;
      if (updateData.tipo_pago_id) gastoUpdateData.tipo_pago_id = updateData.tipo_pago_id;
      if (updateData.tarjeta_id !== undefined) gastoUpdateData.tarjeta_id = updateData.tarjeta_id;

      if (Object.keys(gastoUpdateData).length > 0) {
        await Gasto.update(gastoUpdateData, {
          where: { 
            tipo_origen: 'unico', 
            id_origen: gastoUnico.id 
          },
          transaction
        });
      }

      await transaction.commit();
      logger.info('Gasto único y gasto asociado actualizados exitosamente:', { id: gastoUnico.id });
      
      // Recargar datos actualizados
      const updatedGastoUnico = await this.model.findByPk(gastoUnico.id, {
        include: this.getIncludes()
      });

      return sendSuccess(res, updatedGastoUnico);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al actualizar gasto único:', { error });
      return sendError(res, 500, 'Error al actualizar gasto único', error.message);
    }
  }

  // Método delete mejorado: elimina AMBAS tablas según business rules
  async delete(req, res) {
    const transaction = await sequelize.transaction();
    try {
      // Buscar el gasto único que pertenece al usuario autenticado
      const gastoUnico = await this.gastoUnicoService.findByIdAndUser(req.params.id, req.user.id);
      if (!gastoUnico) {
        await transaction.rollback();
        return sendError(res, 404, 'Gasto único no encontrado');
      }

      // 1. Eliminar gasto asociado primero (business rule: eliminar ambas tablas)
      const deletedGastos = await Gasto.destroy({
        where: { 
          tipo_origen: 'unico', 
          id_origen: gastoUnico.id 
        },
        transaction
      });

      // 2. Eliminar gasto único
      await gastoUnico.destroy({ transaction });

      await transaction.commit();
      logger.info('Gasto único y gasto asociado eliminados exitosamente:', { 
        gastoUnico_id: gastoUnico.id,
        gastos_eliminados: deletedGastos
      });

      return sendSuccess(res, { 
        message: 'Gasto único eliminado correctamente',
        gastos_eliminados: deletedGastos
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al eliminar gasto único:', { error });
      return sendError(res, 500, 'Error al eliminar gasto único', error.message);
    }
  }

  // Método para obtener gastos únicos con filtros y paginación
  async getWithFilters(req, res) {
    try {
      const {
        categoria_gasto_id,
        importancia_gasto_id,
        tipo_pago_id,
        tarjeta_id,
        fecha_desde,
        fecha_hasta,
        monto_min,
        monto_max,
        procesado,
        limit,
        offset = 0,
        orderBy = 'fecha',
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

      // Filtro por estado procesado
      if (procesado !== undefined) where.procesado = procesado === 'true';

      // Filtro por rango de fechas
      if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
      }

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
        
        const gastosUnicos = await this.model.findAndCountAll(queryOptions);
        const pagination = {
          total: gastosUnicos.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < gastosUnicos.count,
          hasPrev: parseInt(offset) > 0
        };
        
        return sendPaginatedSuccess(res, gastosUnicos.rows, pagination);
      } else {
        const gastosUnicos = await this.model.findAll(queryOptions);
        return sendSuccess(res, gastosUnicos);
      }
    } catch (error) {
      logger.error('Error al obtener gastos únicos con filtros:', { error });
      return sendError(res, 500, 'Error al obtener gastos únicos', error.message);
    }
  }


  // Validaciones específicas de GastoUnico
  validateGastoUnicoFields(data) {
    return data.monto && data.fecha;
  }
}

// Crear instancia del controlador
const gastoUnicoController = new GastoUnicoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerGastoUnicoPorId = gastoUnicoController.getById.bind(gastoUnicoController);
export const obtenerGastosUnicosConFiltros = gastoUnicoController.getWithFilters.bind(gastoUnicoController);
export const crearGastoUnico = gastoUnicoController.create.bind(gastoUnicoController);
export const actualizarGastoUnico = gastoUnicoController.update.bind(gastoUnicoController);
export const eliminarGastoUnico = gastoUnicoController.delete.bind(gastoUnicoController);
