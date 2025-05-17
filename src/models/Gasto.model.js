//import sequelize from '../config/database.js';

import { DataTypes } from 'sequelize';

export function defineGasto(sequelize) {
  return sequelize.define('Gasto', {
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    monto_ars: { type: DataTypes.FLOAT },
    monto_usd: { type: DataTypes.FLOAT },
    descripcion: { type: DataTypes.STRING },
    categoria_gasto_id: { type: DataTypes.INTEGER },
    importancia_gasto_id: { type: DataTypes.INTEGER },
    frecuencia_gasto_id: { type: DataTypes.INTEGER, allowNull: true },
    cantidad_cuotas_totales: { type: DataTypes.INTEGER, allowNull: true }, // Opcional
    cantidad_cuotas_pagadas: { type: DataTypes.INTEGER, allowNull: true }, // Opcional
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: true },
    tarjeta_id: { type: DataTypes.INTEGER, allowNull: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'gastos',
    timestamps: false,
  });
}
