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
    frecuencia_gasto_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'frecuencias_gasto',
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
    }
  }, {
    tableName: 'debitos_automaticos',
    timestamps: true,
  });
}
