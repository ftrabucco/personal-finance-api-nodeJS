import { DataTypes } from 'sequelize';

export function defineTarjeta(sequelize) {
  return sequelize.define('Tarjeta', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: { type: DataTypes.STRING, allowNull: false },
    ultimos_4_digitos: {
      type: DataTypes.STRING(4),
      allowNull: true,
      validate: {
        validFormat(value) {
          if (value !== null && value !== '') {
            if (value.length !== 4 || !/^\d{4}$/.test(value)) {
              throw new Error('Debe ingresar exactamente 4 dígitos numéricos');
            }
          }
        }
      },
      comment: 'Últimos 4 dígitos de la tarjeta para identificación'
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['debito', 'credito', 'virtual']]
      },
      comment: 'Tipo de tarjeta: debito, credito, virtual'
    },
    banco: { type: DataTypes.STRING, allowNull: false },
    dia_mes_cierre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 },
      comment: 'Día del mes de cierre para tarjetas de crédito (1-31)'
    },
    dia_mes_vencimiento: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 },
      comment: 'Día del mes de vencimiento para tarjetas de crédito (1-31)'
    },
    permite_cuotas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario de la tarjeta'
    }
  }, {
    tableName: 'tarjetas',
    timestamps: false,
    validate: {
      creditoRequiereFechas() {
        if (this.tipo === 'credito' && (!this.dia_mes_cierre || !this.dia_mes_vencimiento)) {
          throw new Error('Las tarjetas de crédito requieren dia_mes_cierre y dia_mes_vencimiento');
        }
      }
    }
  });
}
