import { DataTypes } from 'sequelize';

export function defineFuenteIngreso(sequelize) {
  return sequelize.define('FuenteIngreso', {
    nombre: { type: DataTypes.STRING, allowNull: false, unique: true }
  }, {
    tableName: 'fuentes_ingreso',
    timestamps: false
  });
}
