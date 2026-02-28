import { DataTypes } from 'sequelize';

export function defineFuenteIngreso(sequelize) {
  return sequelize.define('FuenteIngreso', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL = fuente del sistema
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
    tableName: 'fuentes_ingreso',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nombre', sequelize.fn('COALESCE', sequelize.col('usuario_id'), -1)],
        name: 'idx_fuentes_ingreso_nombre_usuario'
      }
    ]
  });
}
