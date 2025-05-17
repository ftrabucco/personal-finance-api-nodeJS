import { DataTypes } from 'sequelize';

export function defineTarjeta(sequelize) {
    return sequelize.define('Tarjeta', {
        nombre: { type: DataTypes.STRING, allowNull: false },
        tipo: { type: DataTypes.STRING, allowNull: false }, //debito, credito, virtual
        banco: { type: DataTypes.STRING, allowNull: false }, //banco o entidad emisora
        dia_mes_cierre: { type: DataTypes.DATEONLY, allowNull: true },
        dia_mes_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
        permite_cuotas: { type: DataTypes.BOOLEAN, allowNull: true },
    }, {
        tableName: 'tarjetas',
        timestamps: false,
    });
}
