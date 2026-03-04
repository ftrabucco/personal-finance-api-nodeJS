/**
 * 🔄 Transaction Manager
 *
 * Centraliza el manejo de transacciones de base de datos.
 * Elimina la duplicación de try/commit/catch/rollback en controllers.
 *
 * Uso:
 * ```javascript
 * const result = await transactionManager.withTransaction(async (transaction) => {
 *   await service.create(data, transaction);
 *   await otherService.update(data, transaction);
 *   return result;
 * });
 * ```
 */

import logger from '../utils/logger.js';

export class TransactionManager {
  /**
   * @param {Object} deps - Injected dependencies
   * @param {Object} deps.sequelize - Sequelize instance
   */
  constructor({ sequelize }) {
    this.sequelize = sequelize;
  }

  /**
   * Ejecuta una operación dentro de una transacción.
   * Hace commit automáticamente si todo sale bien, rollback si hay error.
   *
   * @param {Function} callback - Función async que recibe la transacción
   * @param {Object} options - Opciones adicionales
   * @param {string} options.isolationLevel - Nivel de aislamiento (opcional)
   * @returns {Promise<any>} El resultado del callback
   * @throws {Error} Re-lanza el error después del rollback
   */
  async withTransaction(callback, options = {}) {
    const transaction = await this.sequelize.transaction({
      isolationLevel: options.isolationLevel
    });

    try {
      const result = await callback(transaction);
      await transaction.commit();

      logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      await transaction.rollback();

      logger.error('Transaction rolled back due to error:', {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Ejecuta múltiples operaciones en una transacción con retry automático.
   * Útil para operaciones que pueden fallar por deadlocks o timeouts.
   *
   * @param {Function} callback - Función async que recibe la transacción
   * @param {Object} options - Opciones
   * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
   * @param {number} options.retryDelay - Delay entre reintentos en ms (default: 100)
   * @returns {Promise<any>}
   */
  async withRetry(callback, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 100;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTransaction(callback, options);
      } catch (error) {
        lastError = error;

        // Solo reintentar en errores de deadlock o timeout
        const isRetryable =
          error.name === 'SequelizeDatabaseError' &&
          (error.parent?.code === '40P01' || // Deadlock
            error.parent?.code === '57014');  // Query cancelled/timeout

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        logger.warn(`Transaction failed (attempt ${attempt}/${maxRetries}), retrying...`, {
          error: error.message
        });

        await this.delay(retryDelay * attempt); // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * Ejecuta operaciones de solo lectura (sin transacción explícita).
   * Útil para queries que no modifican datos.
   *
   * @param {Function} callback - Función async a ejecutar
   * @returns {Promise<any>}
   */
  async readOnly(callback) {
    return await callback();
  }

  /**
   * Helper para delay
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TransactionManager;
