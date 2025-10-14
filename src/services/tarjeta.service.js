import { BaseService } from './base.service.js';
import { Tarjeta, Gasto, Compra } from '../models/index.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export class TarjetaService extends BaseService {
  constructor() {
    super(Tarjeta);
  }

  /**
   * Busca una tarjeta por ID que pertenezca al usuario
   * @param {number} id - ID de la tarjeta
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object|null>} - Tarjeta encontrada o null
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
      logger.error('Error al buscar tarjeta por ID y usuario:', { error, id, userId });
      throw error;
    }
  }

  /**
   * Valida si una tarjeta está en uso por gastos o compras
   * @param {number} tarjetaId - ID de la tarjeta
   * @returns {Promise<{inUse: boolean, usage: Object}>} - Estado de uso
   */
  async validateTarjetaUsage(tarjetaId) {
    try {
      const [gastosCount, comprasCount] = await Promise.all([
        Gasto.count({ where: { tarjeta_id: tarjetaId } }),
        Compra.count({ where: { tarjeta_id: tarjetaId } })
      ]);

      const inUse = gastosCount > 0 || comprasCount > 0;

      return {
        inUse,
        usage: {
          gastos: gastosCount,
          compras: comprasCount,
          total: gastosCount + comprasCount
        }
      };
    } catch (error) {
      logger.error('Error al validar uso de tarjeta:', { error, tarjetaId });
      throw error;
    }
  }

  /**
   * Valida los datos específicos de una tarjeta según su tipo
   * @param {Object} tarjetaData - Datos de la tarjeta
   * @returns {Array} - Array de errores de validación
   */
  validateTarjetaData(tarjetaData) {
    const errors = [];
    const { tipo, dia_mes_cierre, dia_mes_vencimiento, nombre, banco } = tarjetaData;

    // Validar campos requeridos
    if (!nombre?.trim()) {
      errors.push('El nombre de la tarjeta es requerido');
    }

    if (!banco?.trim()) {
      errors.push('El banco es requerido');
    }

    if (!tipo) {
      errors.push('El tipo de tarjeta es requerido');
    }

    // Validar tipo de tarjeta
    const tiposValidos = ['debito', 'credito', 'virtual'];
    if (tipo && !tiposValidos.includes(tipo)) {
      errors.push(`Tipo de tarjeta inválido. Debe ser: ${tiposValidos.join(', ')}`);
    }

    // Validaciones específicas para tarjetas de crédito
    if (tipo === 'credito') {
      if (!dia_mes_cierre) {
        errors.push('Las tarjetas de crédito requieren día de cierre');
      } else if (dia_mes_cierre < 1 || dia_mes_cierre > 31) {
        errors.push('El día de cierre debe estar entre 1 y 31');
      }

      if (!dia_mes_vencimiento) {
        errors.push('Las tarjetas de crédito requieren día de vencimiento');
      } else if (dia_mes_vencimiento < 1 || dia_mes_vencimiento > 31) {
        errors.push('El día de vencimiento debe estar entre 1 y 31');
      }
    }

    // Para tarjetas de débito, no deben tener fechas
    if (tipo === 'debito') {
      if (dia_mes_cierre || dia_mes_vencimiento) {
        errors.push('Las tarjetas de débito no deben tener días de cierre o vencimiento');
      }
    }

    return errors;
  }

  /**
   * Normaliza los datos de la tarjeta según su tipo
   * @param {Object} tarjetaData - Datos de la tarjeta
   * @returns {Object} - Datos normalizados
   */
  normalizeTarjetaData(tarjetaData) {
    const normalized = { ...tarjetaData };

    // Normalizar según tipo
    switch (normalized.tipo) {
    case 'debito':
      normalized.permite_cuotas = false;
      normalized.dia_mes_cierre = null;
      normalized.dia_mes_vencimiento = null;
      break;

    case 'credito':
      normalized.permite_cuotas = true;
      // dia_mes_cierre y dia_mes_vencimiento se mantienen como están
      break;

    case 'virtual':
      // Para virtual, mantener permite_cuotas como se especificó
      if (normalized.permite_cuotas === undefined) {
        normalized.permite_cuotas = false; // Default para virtual
      }
      break;
    }

    // Limpiar strings
    if (normalized.nombre) {
      normalized.nombre = normalized.nombre.trim();
    }
    if (normalized.banco) {
      normalized.banco = normalized.banco.trim();
    }

    return normalized;
  }

  /**
   * Obtiene tarjetas con filtros para un usuario específico
   * @param {Object} filters - Filtros a aplicar
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} - Resultado paginado
   */
  async getWithFilters(filters, userId) {
    try {
      const {
        tipo,
        banco,
        permite_cuotas,
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

      if (permite_cuotas !== undefined) {
        where.permite_cuotas = permite_cuotas === 'true';
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
      logger.error('Error al obtener tarjetas con filtros:', { error, filters, userId });
      throw error;
    }
  }

  /**
   * Verifica si el usuario es dueño de la tarjeta
   * @param {number} tarjetaId - ID de la tarjeta
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} - true si es dueño
   */
  async isOwner(tarjetaId, userId) {
    try {
      const tarjeta = await this.findByIdAndUser(tarjetaId, userId);
      return tarjeta !== null;
    } catch (error) {
      logger.error('Error al verificar ownership de tarjeta:', { error, tarjetaId, userId });
      return false;
    }
  }

  /**
   * Obtiene estadísticas de uso de tarjetas para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} - Estadísticas
   */
  async getUserCardStats(userId) {
    try {
      const [totalTarjetas, tarjetasCredito, tarjetasDebito] = await Promise.all([
        this.model.count({ where: { usuario_id: userId } }),
        this.model.count({ where: { usuario_id: userId, tipo: 'credito' } }),
        this.model.count({ where: { usuario_id: userId, tipo: 'debito' } })
      ]);

      return {
        total: totalTarjetas,
        credito: tarjetasCredito,
        debito: tarjetasDebito,
        virtual: totalTarjetas - tarjetasCredito - tarjetasDebito
      };
    } catch (error) {
      logger.error('Error al obtener estadísticas de tarjetas:', { error, userId });
      throw error;
    }
  }
}
