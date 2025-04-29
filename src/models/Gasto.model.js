//import sequelize from '../config/database.js';

import { DataTypes } from 'sequelize';

export function defineGasto(sequelize) {
  return sequelize.define('Gasto', {
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    monto_ars: { type: DataTypes.FLOAT },
    monto_usd: { type: DataTypes.FLOAT },
    descripcion: { type: DataTypes.STRING },
    tipo_pago_id: { type: DataTypes.INTEGER },
    categoria_gasto_id: { type: DataTypes.INTEGER },
    frecuencia_gasto_id: { type: DataTypes.INTEGER },
    importancia_gasto_id: { type: DataTypes.INTEGER },
    cantidad_cuotas: { type: DataTypes.INTEGER, allowNull: true }, // Opcional

  }, {
    tableName: 'gastos',
    timestamps: false,
  });
}
