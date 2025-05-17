import { DataTypes } from 'sequelize';

export function defineCompra(sequelize) {
  return sequelize.define('Compra', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto_total: { type: DataTypes.FLOAT, allowNull: false },
    cantidad_cuotas: { type: DataTypes.INTEGER, allowNull: false },
    fecha_compra: { type: DataTypes.DATEONLY, allowNull: false },
    categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false },
    tarjeta_id: {type:DataTypes.INTEGER, allowNull:true}
  }, {
    tableName: 'compras',
    timestamps: false,
  });
}
