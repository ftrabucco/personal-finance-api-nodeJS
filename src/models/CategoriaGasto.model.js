import { DataTypes } from 'sequelize';

export function defineCategoriaGasto(sequelize) {
  return sequelize.define('CategoriaGasto', {
    nombre_categoria: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'categorias_gasto',
    timestamps: false,
  });
}
