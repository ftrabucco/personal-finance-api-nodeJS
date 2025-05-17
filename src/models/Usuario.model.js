import { DataTypes } from 'sequelize';

export function defineUsuario(sequelize) {
  return sequelize.define('Usuario', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'usuarios',
    timestamps: false,
  });
}
