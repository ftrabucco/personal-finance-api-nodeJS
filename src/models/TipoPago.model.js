import { DataTypes } from 'sequelize';

export function defineTipoPago(sequelize) {
  return sequelize.define('TipoPago', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    permite_cuotas: { type: DataTypes.BOOLEAN, allowNull: false }
  }, {
    tableName: 'tipos_pago',
    timestamps: false,
  });
}
