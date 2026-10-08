import { DataTypes } from 'sequelize';

export function defineIngresoRecurrente(sequelize) {
  return sequelize.define('IngresoRecurrente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    dia_de_pago: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 31 },
      comment: 'Día del mes en que se recibe el ingreso'
    },
    mes_de_pago: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 12 },
      comment: 'Mes específico para frecuencia anual (1-12)'
    },
    frecuencia_gasto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'frecuencias_gasto',
        key: 'id'
      },
      comment: 'Reutiliza el catálogo de frecuencias existente'
    },
    fuente_ingreso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fuentes_ingreso',
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
      comment: 'Usuario propietario del ingreso recurrente'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha a partir de la cual se considera activo el ingreso'
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha hasta la cual está activo (null = indefinido)'
    },
    ultima_fecha_generado: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Última fecha en que se generó un ingreso único a partir de este ingreso recurrente'
    },
    // 💱 Multi-currency fields
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se recibe el ingreso'
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
      comment: 'Tipo de cambio de referencia al momento de crear'
    }
  }, {
    tableName: 'ingresos_recurrentes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
}
