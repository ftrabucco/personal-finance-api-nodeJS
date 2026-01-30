import { DataTypes } from 'sequelize';

export function defineImportanciaGasto(sequelize) {
  return sequelize.define('ImportanciaGasto', {
    nombre_importancia: { type: DataTypes.STRING, allowNull: false, unique: true }
  }, {
    tableName: 'importancias_gasto',
    timestamps: false
  });
}
