import { DataTypes } from 'sequelize';

export function defineCategoriaGasto(sequelize) {
  return sequelize.define('CategoriaGasto', {
    nombre_categoria: {
      type: DataTypes.STRING,
      allowNull: false
    },
    icono: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '📦'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = categoría del sistema
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    es_sistema: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'categorias_gasto',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nombre_categoria', 'usuario_id'],
        name: 'categorias_nombre_usuario_unique'
      }
    ]
  });
}
