import { GastoUnico, Gasto } from '../models/index.js';
import logger from '../utils/logger.js';

export const GastoUnicoService = {
  async create(data) {
    return await GastoUnico.create(data);
  },

  async findAll() {
    return await GastoUnico.findAll();
  },

  async findById(id) {
    return await GastoUnico.findByPk(id);
  },

  async update(id, data, externalTransaction = null) {
    // Create a safe data object for logging
    const logData = {
      id,
      data: { ...data },
      hasExternalTransaction: !!externalTransaction
    };
    
    // Remove any circular references from the data
    const safeData = JSON.parse(this.safeStringify(data));
    
    logger.info('Starting GastoUnico update', this.safeStringify(logData));
    
    const isExternalTransaction = !!externalTransaction;
    const transaction = externalTransaction || await GastoUnico.sequelize.transaction();
    
    try {
      logger.info('Fetching existing GastoUnico record', { id });
      const record = await GastoUnico.findByPk(id, { 
        transaction,
        raw: true, // Get plain object instead of model instance
        nest: true
      });
      
      if (!record) {
        logger.warn('GastoUnico not found', { id });
        if (!isExternalTransaction) await transaction.rollback();
        return null;
      }
      
      // Create a safe record for logging
      const safeRecord = JSON.parse(this.safeStringify(record));
      logger.info('Found GastoUnico record', { record: safeRecord });

      // Save the old values before updating
      const oldValues = { ...record };
      
      // Update the GastoUnico record using safeData
      logger.info('Updating GastoUnico with data', { 
        id, 
        data: safeData 
      });
      
      const [updatedCount, [updatedRecord]] = await GastoUnico.update(safeData, {
        where: { id },
        returning: true,
        transaction,
        raw: true,
        nest: true
      });
      
      if (updatedCount === 0) {
        throw new Error(`No se pudo actualizar el gasto único con ID ${id}. Verifica que el registro exista y que los datos sean válidos.`);
      }
      
      logger.info('GastoUnico updated successfully', this.safeStringify({
        id,
        updatedCount,
        oldValues,
        newValues: updatedRecord
      }));
      
      logger.info('Checking if we need to update associated Gasto', this.safeStringify({ 
        gastoUnicoId: updatedRecord.id, 
        isProcessed: updatedRecord.procesado, 
        wasProcessed: oldValues.procesado 
      }));
      
      if (updatedRecord.procesado) {
        logger.info('Updating associated Gasto because record is processed', this.safeStringify({ 
          gastoUnicoId: updatedRecord.id, 
          oldValues, 
          newValues: updatedRecord 
        }));
        await this.updateAssociatedGasto(updatedRecord, oldValues, transaction);
      }
      
      // Commit the transaction if it was created in this method
      if (!isExternalTransaction) {
        await transaction.commit();
        logger.info('Transaction committed successfully');
      }
      
      return updatedRecord;
      
    } catch (error) {
      // If we're in a transaction we created, roll it back
      if (!isExternalTransaction && transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          logger.error('Error during transaction rollback:', this.safeStringify({
            error: rollbackError.message,
            originalError: error.message,
            gastoUnicoId: id
          }));
        }
      }
      
      // Log detailed error information
      const errorInfo = {
        message: `Error al actualizar el gasto único: ${error.message}`,
        error: error.message,
        stack: error.stack,
        gastoUnicoId: id,
        timestamp: new Date().toISOString()
      };
      
      logger.error('Error updating GastoUnico and associated Gasto:', this.safeStringify(errorInfo));
      
      // Create a more user-friendly error
      const friendlyError = new Error(`No se pudo actualizar el gasto único: ${error.message}`);
      friendlyError.originalError = error;
      throw friendlyError;
    }
  },

  // Helper function to safely stringify objects with circular references
  safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  },

  async updateAssociatedGasto(gastoUnico, oldValues, transaction) {
    // Create a transaction if one wasn't provided
    const isExternalTransaction = !!transaction;
    const t = transaction || await Gasto.sequelize.transaction();
    
    try {
      // Helper function to normalize dates for comparison
      const normalizeDate = (date) => {
        try {
          if (!date) return null;
          if (date instanceof Date) return date.toISOString().split('T')[0];
          if (typeof date === 'string') return date.split('T')[0];
          return date;
        } catch (error) {
          logger.error('Error normalizing date', { error: error.message });
          return null;
        }
      };
      
      // Create a safe object for logging
      const logData = {
        gastoUnicoId: gastoUnico.id,
        oldValues: {
          ...oldValues,
          fecha: normalizeDate(oldValues.fecha)
        },
        newValues: {
          ...gastoUnico,
          fecha: normalizeDate(gastoUnico.fecha)
        }
      };
      
      logger.info('START updateAssociatedGasto', this.safeStringify(logData));
      
      // Find the associated Gasto
      const findGastoQuery = {
        where: {
          tipo_origen: 'unico',
          id_origen: gastoUnico.id
        },
        transaction: t,
        raw: true,
        nest: true
      };
      
      logger.info('Searching for associated Gasto', this.safeStringify({
        where: findGastoQuery.where,
        hasTransaction: !!t
      }));
      
      const gasto = await Gasto.findOne(findGastoQuery);
      
      logger.info('Gasto findOne result', this.safeStringify({ 
        gastoFound: !!gasto,
        gastoId: gasto?.id 
      }));
      
      if (!gasto) {
        logger.info('No existing Gasto found, creating a new one');
        // Create a new Gasto record
        const newGasto = {
          descripcion: gastoUnico.descripcion,
          monto: gastoUnico.monto,
          fecha: gastoUnico.fecha,
          categoria_gasto_id: gastoUnico.categoria_gasto_id,
          importancia_gasto_id: gastoUnico.importancia_gasto_id,
          tipo_pago_id: gastoUnico.tipo_pago_id,
          tarjeta_id: gastoUnico.tarjeta_id,
          tipo_origen: 'unico',
          id_origen: gastoUnico.id,
          procesado: true
        };
        
        logger.info('Creating new Gasto record', this.safeStringify({ 
          newGasto,
          hasTransaction: !!t
        }));
        
        await Gasto.create(newGasto, { transaction: t });
        
        if (!isExternalTransaction) {
          await t.commit();
          logger.info('Transaction committed successfully');
        }
        
        return null;
      }
      
      // Prepare the fields to update in Gasto
      const gastoUpdates = {};
      
      // Map GastoUnico fields to Gasto fields with proper comparison
      if (gastoUnico.monto !== oldValues.monto) {
        logger.info('monto changed', this.safeStringify({ 
          old: oldValues.monto, 
          new: gastoUnico.monto 
        }));
        gastoUpdates.monto_ars = gastoUnico.monto;
      }
      
      if (gastoUnico.descripcion !== oldValues.descripcion) {
        logger.info('descripcion changed', this.safeStringify({ 
          old: oldValues.descripcion, 
          new: gastoUnico.descripcion 
        }));
        gastoUpdates.descripcion = gastoUnico.descripcion;
      }
      
      const oldFecha = normalizeDate(oldValues.fecha);
      const newFecha = normalizeDate(gastoUnico.fecha);
      if (oldFecha !== newFecha) {
        logger.info('fecha changed', this.safeStringify({ 
          old: oldFecha, 
          new: newFecha 
        }));
        gastoUpdates.fecha = newFecha;
      }
      
      if (gastoUnico.categoria_gasto_id !== oldValues.categoria_gasto_id) {
        logger.info('categoria_gasto_id changed', this.safeStringify({ 
          old: oldValues.categoria_gasto_id, 
          new: gastoUnico.categoria_gasto_id 
        }));
        gastoUpdates.categoria_gasto_id = gastoUnico.categoria_gasto_id;
      }
      
      if (gastoUnico.tipo_pago_id !== oldValues.tipo_pago_id) {
        logger.info('tipo_pago_id changed', this.safeStringify({ 
          old: oldValues.tipo_pago_id, 
          new: gastoUnico.tipo_pago_id 
        }));
        gastoUpdates.tipo_pago_id = gastoUnico.tipo_pago_id;
      }
      
      if (gastoUnico.tarjeta_id !== oldValues.tarjeta_id) {
        logger.info('tarjeta_id changed', this.safeStringify({ 
          old: oldValues.tarjeta_id, 
          new: gastoUnico.tarjeta_id 
        }));
        gastoUpdates.tarjeta_id = gastoUnico.tarjeta_id;
      }

      // Only update if there are changes
      if (Object.keys(gastoUpdates).length > 0) {
        logger.info('Preparing to update Gasto', this.safeStringify({
          gastoId: gasto.id,
          updates: gastoUpdates,
          hasTransaction: !!t
        }));
        
        try {
          // Update the Gasto record
          const [updatedGastoCount] = await Gasto.update(gastoUpdates, {
            where: { id: gasto.id },
            transaction: t
          });
          
          if (updatedGastoCount === 0) {
            throw new Error('Failed to update Gasto record');
          }
          
          logger.info('Successfully updated Gasto record', this.safeStringify({
            gastoId: gasto.id,
            updatedFields: Object.keys(gastoUpdates)
          }));
        } catch (error) {
          logger.error('Error updating Gasto record', this.safeStringify({
            error: error.message,
            gastoId: gasto.id,
            updates: gastoUpdates
          }));
          throw error;
        }
      } else {
        logger.info('No changes detected between old and new GastoUnico values', {
          gastoUnicoId: gastoUnico.id,
          gastoId: gasto.id
        });
      }
      
      return gasto;
    } catch (error) {
      logger.error('Error updating associated Gasto', { 
        gastoUnicoId: gastoUnico.id, 
        error: error.message 
      });
      throw error;
    }
  },

  async delete(id) {
    const record = await GastoUnico.findByPk(id);
    if (!record) return null;
    
    // Don't allow deletion if already processed
    if (record.procesado) {
      throw new Error('Cannot delete a processed GastoUnico');
    }
    
    await record.destroy();
    return record;
  }
};
