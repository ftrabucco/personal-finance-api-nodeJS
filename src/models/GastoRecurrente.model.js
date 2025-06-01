import { DataTypes } from 'sequelize';

export function defineGastoRecurrente(sequelize) {
  return sequelize.define('GastoRecurrente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    dia_de_pago: { type: DataTypes.INTEGER, allowNull: false }, // Día del mes
    frecuencia_gasto_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'frecuencias_gasto',
        key: 'id'
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
    }
  }, {
    tableName: 'gastos_recurrentes',
    timestamps: false,
  });
}
