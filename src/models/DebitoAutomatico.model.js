import { DataTypes } from 'sequelize';

export function defineDebitoAutomatico(sequelize) {
  return sequelize.define('DebitoAutomatico', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    dia_de_pago: { type: DataTypes.INTEGER, allowNull: false }, // Día del mes que se debita
    categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    frecuencia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false }, // deberia ser una que no sea credito
    tarjeta_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'debitos_automaticos',
    timestamps: false,
  });
}
