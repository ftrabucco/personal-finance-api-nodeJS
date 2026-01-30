import { DataTypes } from 'sequelize';

export function defineGastoUnico(sequelize) {
  const GastoUnico = sequelize.define('GastoUnico', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categorias_gasto', key: 'id' } },
    importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'importancias_gasto', key: 'id' } },
    tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tipos_pago', key: 'id' } },
    tarjeta_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tarjetas', key: 'id' } },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario propietario del gasto único'
    },
    procesado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el gasto único ya fue procesado y convertido a un Gasto'
    },
    // 💱 Multi-currency fields
    moneda_origen: {
      type: DataTypes.ENUM('ARS', 'USD'),
      allowNull: false,
      defaultValue: 'ARS',
      comment: 'Moneda en la que se ingresó el gasto originalmente'
    },
    monto_ars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Se calcula automáticamente
      comment: 'Monto en pesos argentinos'
    },
    monto_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Se calcula automáticamente
      comment: 'Monto en dólares estadounidenses'
    },
    tipo_cambio_usado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tipo de cambio usado para la conversión (snapshot)'
    }
  }, {
    tableName: 'gastos_unico',
    timestamps: false
  });

  // Nota: La creación del gasto real se maneja en el controller para mantener atomicidad transaccional

  return GastoUnico;
}
