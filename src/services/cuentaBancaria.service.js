import { BaseService } from './base.service.js';
import { CuentaBancaria, DebitoAutomatico } from '../models/index.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export class CuentaBancariaService extends BaseService {
  constructor() {
    super(CuentaBancaria);
  }

  /**
   * Busca una cuenta bancaria por ID que pertenezca al usuario
   * @param {number} id - ID de la cuenta
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object|null>} - Cuenta encontrada o null
   */
  async findByIdAndUser(id, userId) {
    try {
      return await this.model.findOne({
        where: {
          id,
          usuario_id: userId
        }
      });
    } catch (error) {
      logger.error('Error al buscar cuenta bancaria por ID y usuario:', { error, id, userId });
      throw error;
    }
  }

  /**
   * Valida si una cuenta bancaria está en uso por débitos automáticos
   * @param {number} cuentaId - ID de la cuenta
   * @returns {Promise<{inUse: boolean, usage: Object}>} - Estado de uso
   */
  async validateCuentaUsage(cuentaId) {
    try {
      const debitosCount = await DebitoAutomatico.count({
        where: { cuenta_bancaria_id: cuentaId }
      });

      return {
        inUse: debitosCount > 0,
        usage: {
          debitosAutomaticos: debitosCount,
          total: debitosCount
        }
      };
    } catch (error) {
      logger.error('Error al validar uso de cuenta bancaria:', { error, cuentaId });
      throw error;
    }
  }

  /**
   * Normaliza los datos de la cuenta bancaria
   * @param {Object} cuentaData - Datos de la cuenta
   * @returns {Object} - Datos normalizados
   */
  normalizeCuentaData(cuentaData) {
    const normalized = { ...cuentaData };

    // Limpiar strings
    if (normalized.nombre) {
      normalized.nombre = normalized.nombre.trim();
    }
    if (normalized.banco) {
      normalized.banco = normalized.banco.trim();
    }

    // Normalizar ultimos_4_digitos: empty string -> null
    if (!normalized.ultimos_4_digitos) {
      normalized.ultimos_4_digitos = null;
    }

    return normalized;
  }

  /**
   * Obtiene cuentas bancarias con filtros para un usuario específico
   * @param {Object} filters - Filtros a aplicar
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} - Resultado paginado
   */
  async getWithFilters(filters, userId) {
    try {
      const {
        tipo,
        banco,
        moneda,
        activa,
        limit,
        offset = 0,
        orderBy = 'nombre',
        orderDirection = 'ASC'
      } = filters;

      // Siempre filtrar por usuario
      const where = {
        usuario_id: userId
      };

      // Aplicar filtros opcionales
      if (tipo) {
        where.tipo = tipo;
      }

      if (banco) {
        where.banco = {
          [Op.iLike]: `%${banco}%`
        };
      }

      if (moneda) {
        where.moneda = moneda;
      }

      if (activa !== undefined) {
        where.activa = activa === 'true' || activa === true;
      }

      const queryOptions = {
        where,
        order: [[orderBy, orderDirection]]
      };

      // Aplicar paginación si se especifica
      if (limit) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);
      }

      const result = await this.model.findAndCountAll(queryOptions);

      return {
        data: result.rows,
        meta: {
          total: result.count,
          count: result.rows.length,
          offset: parseInt(offset),
          limit: limit ? parseInt(limit) : result.count
        }
      };
    } catch (error) {
      logger.error('Error al obtener cuentas bancarias con filtros:', { error, filters, userId });
      throw error;
    }
  }

  /**
   * Verifica si el usuario es dueño de la cuenta
   * @param {number} cuentaId - ID de la cuenta
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} - true si es dueño
   */
  async isOwner(cuentaId, userId) {
    try {
      const cuenta = await this.findByIdAndUser(cuentaId, userId);
      return cuenta !== null;
    } catch (error) {
      logger.error('Error al verificar ownership de cuenta bancaria:', { error, cuentaId, userId });
      return false;
    }
  }

  /**
   * Obtiene estadísticas de uso de cuentas bancarias para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} - Estadísticas
   */
  async getUserAccountStats(userId) {
    try {
      const [totalCuentas, cuentasAhorro, cuentasCorriente, cuentasActivas] = await Promise.all([
        this.model.count({ where: { usuario_id: userId } }),
        this.model.count({ where: { usuario_id: userId, tipo: 'ahorro' } }),
        this.model.count({ where: { usuario_id: userId, tipo: 'corriente' } }),
        this.model.count({ where: { usuario_id: userId, activa: true } })
      ]);

      return {
        total: totalCuentas,
        ahorro: cuentasAhorro,
        corriente: cuentasCorriente,
        activas: cuentasActivas,
        inactivas: totalCuentas - cuentasActivas
      };
    } catch (error) {
      logger.error('Error al obtener estadísticas de cuentas bancarias:', { error, userId });
      throw error;
    }
  }
}
