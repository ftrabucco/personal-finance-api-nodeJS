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
    categoria_gasto_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'categorias_gasto',
        key: 'id'
      }
    },
    importancia_gasto_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'importancias_gasto',
        key: 'id'
      }
    },
    tipo_pago_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'tipos_pago',
        key: 'id'
      }
    },
    tarjeta_id: {
      type: DataTypes.INTEGER, 
      allowNull: true,
      references: {
        model: 'tarjetas',
        key: 'id'
      }
    },
    pendiente_cuotas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica si aún quedan cuotas por generar'
    }
  }, {
    tableName: 'compras',
    timestamps: false,
  });
}
