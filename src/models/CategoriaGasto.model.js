import { DataTypes } from 'sequelize';

export function defineCategoriaGasto(sequelize) {
  return sequelize.define('CategoriaGasto', {
    nombre_categoria: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'categoria_gasto',
    timestamps: false,
  });
}
