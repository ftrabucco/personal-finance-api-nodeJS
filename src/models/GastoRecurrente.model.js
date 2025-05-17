import { DataTypes } from 'sequelize';

export function defineGastoRecurrente(sequelize) {
  return sequelize.define('GastoRecurrente', {
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    dia_referencia: { type: DataTypes.INTEGER, allowNull: false }, // Día del mes o semana
    frecuencia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false },
    tarjeta_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'gastos_recurrentes',
    timestamps: false,
  });
}
