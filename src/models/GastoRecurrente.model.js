import { DataTypes } from 'sequelize';

export function defineGastoRecurrente(sequelize) {
  return sequelize.define('GastoRecurrente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    dia_de_pago: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 31 } }, // Día del mes
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
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario del gasto recurrente'
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
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha a partir de la cual se empezará a generar el gasto recurrente'
    },
    // 💱 Multi-currency fields
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se ingresó el gasto recurrente'
    },
    monto_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto en pesos argentinos'
    },
    monto_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto en dólares estadounidenses'
    },
    tipo_cambio_referencia: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tipo de cambio de referencia (cada gasto usa TC del día)'
    }
  }, {
    tableName: 'gastos_recurrentes',
    timestamps: true
  });
}
