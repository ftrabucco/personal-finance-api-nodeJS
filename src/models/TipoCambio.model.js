import { DataTypes } from 'sequelize';

/**
 * 💱 MODELO: Tipo de Cambio (Exchange Rate)
 *
 * Almacena el historial de tipos de cambio USD-ARS para:
 * - Conversión automática de gastos
 * - Mantener integridad histórica (snapshot de TC usado)
 * - Proyecciones y reportes
 *
 * Características:
 * - Un registro por día (fecha como PK)
 * - Valores de compra y venta separados
 * - Fuente: manual o API externa
 * - Se actualiza diariamente vía job o manualmente
 */
export function defineTipoCambio(sequelize) {
  return sequelize.define('TipoCambio', {
    fecha: {
      type: DataTypes.DATEONLY,
      primaryKey: true,
      allowNull: false,
      comment: 'Fecha del tipo de cambio (PK) - un registro por día'
    },
    valor_compra_usd_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
        isDecimal: true
      },
      comment: 'Cotización de compra: cuántos ARS se pagan por 1 USD'
    },
    valor_venta_usd_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
        isDecimal: true
      },
      comment: 'Cotización de venta: cuántos ARS se reciben por 1 USD'
    },
    fuente: {
      type: DataTypes.ENUM('manual', 'api_bcra', 'api_dolar_api', 'api_otros'),
      allowNull: false,
      defaultValue: 'manual',
      comment: 'Origen del tipo de cambio: manual o API externa'
    },
    observaciones: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Notas adicionales sobre el tipo de cambio del día'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica si es el tipo de cambio válido para usar'
    }
  }, {
    tableName: 'tipos_cambio',
    schema: 'finanzas',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        name: 'idx_tipos_cambio_fecha',
        fields: ['fecha']
      },
      {
        name: 'idx_tipos_cambio_activo',
        fields: ['activo', 'fecha']
      }
    ],
    validate: {
      // Validación: compra debe ser <= venta
      ventaMayorQueCompra() {
        if (this.valor_venta_usd_ars < this.valor_compra_usd_ars) {
          throw new Error('El valor de venta debe ser mayor o igual al valor de compra');
        }
      }
    }
  });
}
