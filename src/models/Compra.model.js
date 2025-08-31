import { DataTypes } from 'sequelize';

export function defineCompra(sequelize) {
  return sequelize.define('Compra', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    monto_total: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: {
        min: 0.01,
        isDecimal: true
      }
    },
    cantidad_cuotas: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 60
      }
    },
    fecha_compra: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      validate: {
        isDate: true,
        notFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('La fecha de compra no puede ser futura');
          }
        }
      }
    },
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
