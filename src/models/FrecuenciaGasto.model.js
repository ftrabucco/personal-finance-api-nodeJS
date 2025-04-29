import { DataTypes } from 'sequelize';

export function defineFrecuenciaGasto(sequelize) {
  return sequelize.define('FrecuenciaGasto', {
    nombre_frecuencia: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'frecuencia_gasto',
    timestamps: false,
  });
}
