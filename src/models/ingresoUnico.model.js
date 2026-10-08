import { DataTypes } from 'sequelize';

export function defineIngresoUnico(sequelize) {
  const IngresoUnico = sequelize.define('IngresoUnico', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    fuente_ingreso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'fuentes_ingreso', key: 'id' }
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario del ingreso'
    },
    // 💱 Multi-currency fields
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se ingresó el ingreso originalmente'
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
    tipo_cambio_usado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tipo de cambio usado para la conversión (snapshot)'
    },
    ingreso_recurrente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'ingresos_recurrentes', key: 'id' },
      comment: 'NULL si es un ingreso único manual; si no, marca esta fila como la ocurrencia generada de ese ingreso recurrente para su fecha'
    }
  }, {
    tableName: 'ingresos_unico',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return IngresoUnico;
}
