//import sequelize from '../config/database.js';

import { DataTypes } from 'sequelize';

export function defineGasto(sequelize) {
  return sequelize.define('Gasto', {
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        notFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('La fecha no puede ser futura');
          }
        }
      }
    },
    monto_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0.01,
        isDecimal: true
      }
    },
    monto_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0.01,
        isDecimal: true
      }
    },
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: true,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se ingresó originalmente el gasto'
    },
    tipo_cambio_usado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tipo de cambio usado para la conversión (snapshot histórico)'
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    categoria_gasto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categorias_gasto',
        key: 'id'
      }
    },
    importancia_gasto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'importancias_gasto',
        key: 'id'
      }
    },
    frecuencia_gasto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'frecuencias_gasto',
        key: 'id'
      }
    },
    cantidad_cuotas_totales: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Número total de cuotas para gastos a plazos',
      validate: {
        min: 1,
        max: 60
      }
    },
    cantidad_cuotas_pagadas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Número de cuotas ya pagadas para gastos a plazos',
      validate: {
        min: 0,
        isValidCuotaPagada(value) {
          if (value && this.cantidad_cuotas_totales && value > this.cantidad_cuotas_totales) {
            throw new Error('Las cuotas pagadas no pueden exceder las cuotas totales');
          }
        }
      }
    },
    tipo_pago_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tipos_pago',
        key: 'id'
      }
    },
    tarjeta_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tarjetas',
        key: 'id'
      }
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    tipo_origen: {
      type: DataTypes.ENUM('recurrente', 'debito_automatico', 'compra', 'unico'),
      allowNull: false,
      comment: 'Tipo de origen del gasto (recurrente, debito_automatico, compra, unico)'
    },
    id_origen: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la entidad origen (gasto_recurrente, debito_automatico, compra o gasto_unico)'
    }
  }, {
    tableName: 'gastos',
    timestamps: true
  });
}
