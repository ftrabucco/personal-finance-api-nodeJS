import { DataTypes } from 'sequelize';

export function defineUserFuenteIngresoPreference(sequelize) {
  return sequelize.define('UserFuenteIngresoPreference', {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    fuente_ingreso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fuentes_ingreso',
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
    tableName: 'user_fuente_ingreso_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['usuario_id', 'fuente_ingreso_id']
      }
    ]
  });
}
