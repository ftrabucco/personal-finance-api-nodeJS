import { DataTypes } from 'sequelize';

export function defineGastoUnico(sequelize) {
  return sequelize.define('GastoUnico', {
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false },
    tarjeta_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'gastos_unico',
    timestamps: false,
  });
}
