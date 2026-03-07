import { DataTypes } from 'sequelize';

export function defineFuenteIngreso(sequelize) {
  return sequelize.define('FuenteIngreso', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    icono: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '💰'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = fuente del sistema
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
    tableName: 'fuentes_ingreso',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nombre', 'usuario_id'],
        name: 'fuentes_nombre_usuario_unique'
      }
    ]
  });
}
