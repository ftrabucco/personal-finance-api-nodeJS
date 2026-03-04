import { DataTypes } from 'sequelize';

export function defineCuentaBancaria(sequelize) {
  return sequelize.define('CuentaBancaria', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre descriptivo de la cuenta (ej: "Cuenta Sueldo Galicia")'
    },
    banco: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del banco'
    },
    tipo: {
      type: DataTypes.ENUM('ahorro', 'corriente'),
      allowNull: false,
      comment: 'Tipo de cuenta: ahorro o corriente'
    },
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
      comment: 'Últimos 4 dígitos del CBU/número de cuenta para identificación'
    },
    moneda: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda de la cuenta'
    },
    activa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Si la cuenta está activa'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario de la cuenta'
    }
  }, {
    tableName: 'cuentas_bancarias',
    timestamps: true
  });
}
