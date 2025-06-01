//import sequelize from '../config/database.js';

import { DataTypes } from 'sequelize';

export function defineGasto(sequelize) {
  return sequelize.define('Gasto', {
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    monto_ars: { type: DataTypes.FLOAT },
    monto_usd: { type: DataTypes.FLOAT },
    descripcion: { type: DataTypes.STRING },
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
    cantidad_cuotas_totales: { type: DataTypes.INTEGER, allowNull: true },
    cantidad_cuotas_pagadas: { type: DataTypes.INTEGER, allowNull: true },
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
      type: DataTypes.ENUM('recurrente', 'debito', 'compra', 'unico'),
      allowNull: false 
    },
    id_origen: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la entidad origen (gasto_recurrente, debito_automatico, compra o gasto_unico)'
    }
  }, {
    tableName: 'gastos',
    timestamps: true,
  });
}
