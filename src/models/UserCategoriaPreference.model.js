import { DataTypes } from 'sequelize';

export function defineUserCategoriaPreference(sequelize) {
  return sequelize.define('UserCategoriaPreference', {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    categoria_gasto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categorias_gasto',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'user_categoria_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['usuario_id', 'categoria_gasto_id']
      }
    ]
  });
}
