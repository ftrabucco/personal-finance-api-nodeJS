import { BaseService } from './base.service.js';

/**
 * Service for managing gastos únicos (one-time expenses)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for one-time expenses with strategy integration
 *
 * 🏗️ DI-enabled: Receives dependencies via constructor injection
 */
export class GastoUnicoService extends BaseService {
  /**
   * @param {Object} deps - Injected dependencies (from Awilix container)
   * @param {Object} deps.models - Sequelize models
   * @param {Object} deps.transactionManager - Transaction wrapper utility
   * @param {Object} deps.immediateStrategy - Strategy for immediate expense generation
   * @param {Object} deps.exchangeRateService - Service for currency conversion
   * @param {Object} deps.logger - Logger instance
   */
  constructor({ models, transactionManager, immediateStrategy, exchangeRateService, logger }) {
    super(models.GastoUnico);
    this.models = models;
    this.transactionManager = transactionManager;
    this.immediateStrategy = immediateStrategy;
    this.exchangeRateService = exchangeRateService;
    this.logger = logger;
  }

  /**
   * Find all one-time expenses with related data
   * Overrides base method to include specific associations
   */
  async findAll(options = {}) {
    const { CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } = this.models;

    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ],
      order: [['id', 'DESC']],
      ...options
    };

    return super.findAll(defaultOptions);
  }

  /**
   * Find all one-time expenses for a specific user
   * @param {number} userId - ID of the user
   * @param {Object} options - Additional query options
   */
  async findAllByUser(userId, options = {}) {
    const userFilterOptions = {
      where: {
        usuario_id: userId,
        ...(options.where || {})
      },
      ...options
    };

    return this.findAll(userFilterOptions);
  }

  /**
   * Find one-time expense by ID with related data
   * Overrides base method to include specific associations
   */
  async findById(id, options = {}) {
    const { CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } = this.models;

    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ],
      ...options
    };

    return super.findById(id, defaultOptions);
  }

  /**
   * Find one-time expense by ID for a specific user
   * @param {number} id - ID of the expense
   * @param {number} userId - ID of the user
   * @param {Object} options - Additional query options
   */
  async findByIdAndUser(id, userId, options = {}) {
    const userFilterOptions = {
      where: {
        usuario_id: userId,
        ...(options.where || {})
      },
      ...options
    };

    return this.findById(id, userFilterOptions);
  }

  /**
   * Create one-time expense with automatic real expense generation for a specific user
   * @param {Object} data - One-time expense data
   * @param {number} userId - ID of the user
   * @param {Object} externalTransaction - Optional external transaction
   */
  async createForUser(data, userId, externalTransaction = null) {
    return this.createWithGastoReal({
      ...data,
      usuario_id: userId
    }, externalTransaction);
  }

  /**
   * Create one-time expense with automatic real expense generation
   * Uses ImmediateExpenseStrategy for transactional creation
   * 💱 Handles multi-currency conversion automatically
   * 🏗️ Uses TransactionManager for clean transaction handling
   * @param {Object} data - One-time expense data
   * @param {Object} externalTransaction - Optional external transaction
   * @returns {Object} - The created one-time expense
   */
  async createWithGastoReal(data, externalTransaction = null) {
    // If external transaction provided, execute directly
    if (externalTransaction) {
      return this._createWithGastoRealInternal(data, externalTransaction);
    }

    // Use TransactionManager for automatic transaction handling
    return this.transactionManager.withTransaction(async (transaction) => {
      return this._createWithGastoRealInternal(data, transaction);
    });
  }

  /**
   * Internal implementation of createWithGastoReal
   * Separated to allow both external and managed transactions
   * @private
   */
  async _createWithGastoRealInternal(data, transaction) {
    // 💱 Calculate both currencies based on moneda_origen
    const monedaOrigen = data.moneda_origen || 'ARS';
    const monto = data.monto;

    let gastoUnicoData = {
      ...data,
      moneda_origen: monedaOrigen,
      procesado: false
    };

    // Only calculate if not already provided
    if (!data.monto_ars || !data.monto_usd) {
      try {
        const { monto_ars, monto_usd, tipo_cambio_usado } =
          await this.exchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

        gastoUnicoData = {
          ...gastoUnicoData,
          monto_ars,
          monto_usd,
          tipo_cambio_usado
        };

        this.logger.debug('Multi-currency conversion applied to GastoUnico', {
          moneda_origen: monedaOrigen,
          monto_original: monto,
          monto_ars,
          monto_usd,
          tipo_cambio_usado
        });
      } catch (exchangeError) {
        // If exchange rate service fails, use backward compatibility
        this.logger.warn('Exchange rate conversion failed, using backward compatibility', {
          error: exchangeError.message
        });

        if (monedaOrigen === 'ARS') {
          gastoUnicoData.monto_ars = monto;
          gastoUnicoData.monto_usd = null;
        } else {
          gastoUnicoData.monto_ars = monto; // Fallback
          gastoUnicoData.monto_usd = null;
        }
      }
    }

    // 1. Create one-time expense (not processed yet)
    const gastoUnico = await super.create(gastoUnicoData, { transaction });

    // 2. Generate real expense using immediate strategy
    const gasto = await this.immediateStrategy.generate(gastoUnico, transaction);

    if (!gasto) {
      throw new Error('Failed to generate real expense from one-time expense');
    }

    // 3. Mark as processed
    await gastoUnico.update({ procesado: true }, { transaction });

    this.logger.info('One-time expense and real expense created successfully (multi-currency)', {
      gastoUnico_id: gastoUnico.id,
      gasto_id: gasto.id,
      monto_ars: gastoUnico.monto_ars,
      monto_usd: gastoUnico.monto_usd,
      moneda_origen: gastoUnico.moneda_origen,
      descripcion: data.descripcion
    });

    return gastoUnico;
  }

  /**
   * Create simple one-time expense without auto-generation
   * Used for manual creation without immediate processing
   */
  async create(data) {
    const processedData = {
      ...data,
      procesado: data.procesado ?? false
    };

    const gastoUnico = await super.create(processedData);

    this.logger.info('Simple one-time expense created', {
      id: gastoUnico.id,
      descripcion: gastoUnico.descripcion,
      monto: gastoUnico.monto,
      procesado: gastoUnico.procesado
    });

    return gastoUnico;
  }

  /**
   * Update one-time expense with automatic associated real expense update
   * Maintains sync between GastoUnico and its generated Gasto
   * 🏗️ Uses TransactionManager for clean transaction handling
   * @param {number} id - ID of the one-time expense to update
   * @param {Object} data - Update data
   * @param {Object} externalTransaction - Optional external transaction
   */
  async update(id, data, externalTransaction = null) {
    // If external transaction provided, execute directly
    if (externalTransaction) {
      return this._updateInternal(id, data, externalTransaction);
    }

    // Use TransactionManager for automatic transaction handling
    return this.transactionManager.withTransaction(async (transaction) => {
      return this._updateInternal(id, data, transaction);
    });
  }

  /**
   * Internal implementation of update
   * Separated to allow both external and managed transactions
   * @private
   */
  async _updateInternal(id, data, transaction) {
    // Get existing record with raw data for comparison
    const existingRecord = await this.model.findByPk(id, {
      transaction,
      raw: true,
      nest: true
    });

    if (!existingRecord) {
      return null;
    }

    // Store old values for comparison
    const oldValues = { ...existingRecord };
    const safeData = this.sanitizeUpdateData(data);

    // Update the one-time expense
    const [updatedCount, [updatedRecord]] = await this.model.update(safeData, {
      where: { id },
      transaction,
      returning: true,
      raw: true,
      nest: true
    });

    if (updatedCount === 0) {
      throw new Error(`Failed to update one-time expense with id ${id}`);
    }

    this.logger.info('One-time expense updated successfully', {
      id,
      updatedFields: Object.keys(safeData),
      procesado: updatedRecord.procesado
    });

    // Update associated real expense if the record is processed
    if (updatedRecord.procesado) {
      await this.updateAssociatedGasto(updatedRecord, oldValues, transaction);
    }

    // Return the updated record as a model instance
    return await this.findById(id);
  }

  /**
   * Find unprocessed one-time expenses
   * Used by manual generation processes
   */
  async findUnprocessed() {
    return this.findAll({
      where: { procesado: false }
    });
  }

  /**
   * Find unprocessed one-time expenses for a specific user
   */
  async findUnprocessedByUser(userId) {
    return this.findAllByUser(userId, {
      where: { procesado: false }
    });
  }

  /**
   * Find processed one-time expenses
   */
  async findProcessed() {
    return this.findAll({
      where: { procesado: true }
    });
  }

  /**
   * Find processed one-time expenses for a specific user
   */
  async findProcessedByUser(userId) {
    return this.findAllByUser(userId, {
      where: { procesado: true }
    });
  }

  /**
   * Mark one-time expense as processed
   * Usually called after successful real expense generation
   */
  async markAsProcessed(id, transaction = null) {
    const updated = await this.update(id, { procesado: true }, transaction);

    if (updated) {
      this.logger.info('One-time expense marked as processed', { id });
    }

    return updated;
  }

  /**
   * Generate real expense from unprocessed one-time expense
   * Used by scheduler for batch processing
   */
  async generateRealExpense(gastoUnicoId, transaction = null) {
    const gastoUnico = await this.findById(gastoUnicoId);

    if (!gastoUnico) {
      throw new Error(`One-time expense with id ${gastoUnicoId} not found`);
    }

    if (gastoUnico.procesado) {
      this.logger.warn('Attempting to generate real expense from already processed one-time expense', {
        gastoUnico_id: gastoUnicoId
      });
      return null;
    }

    const gasto = await this.immediateStrategy.generate(gastoUnico, transaction);

    if (gasto) {
      await this.markAsProcessed(gastoUnicoId, transaction);

      this.logger.info('Real expense generated from one-time expense', {
        gastoUnico_id: gastoUnicoId,
        gasto_id: gasto.id
      });
    }

    return gasto;
  }

  /**
   * Update the associated real expense when one-time expense is modified
   * Maintains data consistency between source and generated expense
   * @param {Object} gastoUnico - Updated one-time expense data
   * @param {Object} oldValues - Previous values for comparison
   * @param {Object} transaction - Database transaction
   */
  async updateAssociatedGasto(gastoUnico, oldValues, transaction) {
    const { Gasto } = this.models;

    try {
      this.logger.info('Updating associated real expense', {
        gastoUnico_id: gastoUnico.id,
        changes: this.getChangedFields(gastoUnico, oldValues)
      });

      // Find the associated real expense
      const associatedGasto = await Gasto.findOne({
        where: {
          tipo_origen: 'unico',
          id_origen: gastoUnico.id
        },
        transaction,
        raw: true
      });

      if (!associatedGasto) {
        this.logger.warn('No associated real expense found, creating new one', {
          gastoUnico_id: gastoUnico.id
        });

        // Generate new real expense if none exists
        await this.immediateStrategy.generate(gastoUnico, transaction);
        return;
      }

      // Prepare update data for real expense
      const gastoUpdateData = this.mapGastoUnicoToGastoUpdate(gastoUnico, oldValues);

      if (Object.keys(gastoUpdateData).length > 0) {
        const [updatedCount] = await Gasto.update(gastoUpdateData, {
          where: { id: associatedGasto.id },
          transaction
        });

        if (updatedCount > 0) {
          this.logger.info('Associated real expense updated successfully', {
            gasto_id: associatedGasto.id,
            gastoUnico_id: gastoUnico.id,
            updatedFields: Object.keys(gastoUpdateData)
          });
        } else {
          this.logger.warn('No changes applied to associated real expense', {
            gasto_id: associatedGasto.id,
            gastoUnico_id: gastoUnico.id
          });
        }
      } else {
        this.logger.info('No relevant changes for associated real expense', {
          gastoUnico_id: gastoUnico.id
        });
      }

    } catch (error) {
      this.logger.error('Error updating associated real expense', {
        error: error.message,
        gastoUnico_id: gastoUnico.id
      });
      throw error;
    }
  }

  /**
   * Delete one-time expense with its associated real expense
   * 🏗️ Uses TransactionManager for clean transaction handling
   * @param {number} id - ID of the one-time expense to delete
   * @returns {Object} - { gastosEliminados: number }
   */
  async deleteWithAssociatedGasto(id) {
    return this.transactionManager.withTransaction(async (transaction) => {
      const { Gasto } = this.models;

      // 1. Delete associated real expense first
      const gastosEliminados = await Gasto.destroy({
        where: {
          tipo_origen: 'unico',
          id_origen: id
        },
        transaction
      });

      // 2. Delete one-time expense
      await this.model.destroy({
        where: { id },
        transaction
      });

      this.logger.info('One-time expense and associated real expense deleted', {
        gastoUnico_id: id,
        gastos_eliminados: gastosEliminados
      });

      return { gastosEliminados };
    });
  }

  /**
   * Map one-time expense fields to real expense update data
   * Only includes changed fields that affect the real expense
   * 💱 Handles multi-currency fields
   */
  mapGastoUnicoToGastoUpdate(gastoUnico, oldValues) {
    const updateData = {};

    // Map relevant field changes
    if (gastoUnico.monto !== oldValues.monto) {
      updateData.monto_ars = gastoUnico.monto_ars || gastoUnico.monto;
    }

    // 💱 Update multi-currency amounts if changed
    if (gastoUnico.monto_ars !== oldValues.monto_ars) {
      updateData.monto_ars = gastoUnico.monto_ars;
    }

    if (gastoUnico.monto_usd !== oldValues.monto_usd) {
      updateData.monto_usd = gastoUnico.monto_usd;
    }

    if (gastoUnico.descripcion !== oldValues.descripcion) {
      updateData.descripcion = gastoUnico.descripcion;
    }

    if (gastoUnico.fecha !== oldValues.fecha) {
      updateData.fecha = gastoUnico.fecha;
    }

    if (gastoUnico.categoria_gasto_id !== oldValues.categoria_gasto_id) {
      updateData.categoria_gasto_id = gastoUnico.categoria_gasto_id;
    }

    if (gastoUnico.tipo_pago_id !== oldValues.tipo_pago_id) {
      updateData.tipo_pago_id = gastoUnico.tipo_pago_id;
    }

    if (gastoUnico.tarjeta_id !== oldValues.tarjeta_id) {
      updateData.tarjeta_id = gastoUnico.tarjeta_id;
    }

    return updateData;
  }

  /**
   * Get list of changed fields between old and new values
   */
  getChangedFields(newValues, oldValues) {
    const changes = [];
    const relevantFields = ['monto', 'descripcion', 'fecha', 'categoria_gasto_id', 'tipo_pago_id', 'tarjeta_id'];

    relevantFields.forEach(field => {
      if (newValues[field] !== oldValues[field]) {
        changes.push({
          field,
          oldValue: oldValues[field],
          newValue: newValues[field]
        });
      }
    });

    return changes;
  }

  /**
   * Sanitize update data to prevent issues with circular references
   * 💱 Includes multi-currency fields
   */
  sanitizeUpdateData(data) {
    const allowedFields = [
      'descripcion', 'monto', 'fecha', 'categoria_gasto_id',
      'importancia_gasto_id', 'tipo_pago_id', 'tarjeta_id', 'procesado',
      // 💱 Multi-currency fields
      'moneda_origen', 'monto_ars', 'monto_usd', 'tipo_cambio_usado'
    ];

    const sanitized = {};
    allowedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        sanitized[field] = data[field];
      }
    });

    return sanitized;
  }

  /**
   * Safe JSON stringify that handles circular references
   */
  safeStringify(obj) {
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (typeof value.toJSON === 'function') {
            return value.toJSON();
          }
        }
        return value;
      });
    } catch (error) {
      return `[Circular Reference Error: ${error.message}]`;
    }
  }
}
