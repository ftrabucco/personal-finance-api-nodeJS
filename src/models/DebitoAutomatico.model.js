import { DataTypes } from 'sequelize';

export function defineDebitoAutomatico(sequelize) {
  return sequelize.define('DebitoAutomatico', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    dia_de_pago: {
      type: DataTypes.INTEGER,
      allowNull: true, // Null when using credit card (uses card's due date instead)
      validate: { min: 1, max: 31 },
      comment: 'Día del mes que se debita. Null si usa tarjeta de crédito (usa dia_vencimiento de la tarjeta)'
    },
    usa_vencimiento_tarjeta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, usa dia_vencimiento de la tarjeta de crédito en lugar de dia_de_pago'
    },
    mes_de_pago: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 12 },
      comment: 'Mes específico para frecuencia anual (1-12)'
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha hasta la cual el débito automático estará activo'
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha a partir de la cual se empezará a generar el débito automático'
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
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario del débito automático'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ultima_fecha_generado: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Última fecha en que se generó un gasto desde este débito automático'
    },
    // 💱 Multi-currency fields
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se cobra el débito automático'
    },
    monto_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto en pesos argentinos (actualizado diariamente)'
    },
    monto_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto en dólares estadounidenses (actualizado diariamente)'
    },
    tipo_cambio_referencia: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tipo de cambio de referencia (actualizado diariamente)'
    }
  }, {
    tableName: 'debitos_automaticos',
    timestamps: true
  });
}
