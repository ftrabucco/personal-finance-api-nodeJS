import { DataTypes } from 'sequelize';

export function defineGastoRecurrente(sequelize) {
  return sequelize.define('GastoRecurrente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    dia_de_pago: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 31 } }, // Día del mes
    mes_de_pago: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      validate: { min: 1, max: 12 },
      comment: 'Mes de pago para gastos anuales (1-12). Null para otras frecuencias'
    },
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
    },
    activo: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true 
    },
    ultima_fecha_generado: { 
      type: DataTypes.DATEONLY, 
      allowNull: true,
      comment: 'Última fecha en que se generó un gasto a partir de este gasto recurrente'
    }
  }, {
    tableName: 'gastos_recurrentes',
    timestamps: true,
  });
}
