import { DataTypes } from 'sequelize';

export function defineCategoriaGasto(sequelize) {
  return sequelize.define('CategoriaGasto', {
    nombre_categoria: {
      type: DataTypes.STRING,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL = categoría del sistema
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    icono: {
      type: DataTypes.STRING(10),
      allowNull: true
    }
  }, {
    tableName: 'categorias_gasto',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nombre_categoria', sequelize.fn('COALESCE', sequelize.col('usuario_id'), -1)],
        name: 'idx_categorias_gasto_nombre_usuario'
      }
    ]
  });
}
