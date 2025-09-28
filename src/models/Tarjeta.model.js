import { DataTypes } from 'sequelize';

export function defineTarjeta(sequelize) {
    return sequelize.define('Tarjeta', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: { type: DataTypes.STRING, allowNull: false },
        tipo: { 
            type: DataTypes.STRING, 
            allowNull: false,
            validate: {
                isIn: [['debito', 'credito', 'virtual']]
            },
            comment: 'Tipo de tarjeta: debito, credito, virtual'
        },
        banco: { type: DataTypes.STRING, allowNull: false },
        dia_cierre: { 
            type: DataTypes.INTEGER, 
            allowNull: true,
            validate: { min: 1, max: 31 },
            comment: 'Día del mes de cierre para tarjetas de crédito (1-31)'
        },
        dia_vencimiento: { 
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
        },
    }, {
        tableName: 'tarjetas',
        timestamps: false,
        validate: {
            creditoRequiereFechas() {
                if (this.tipo === 'credito' && (!this.dia_cierre || !this.dia_vencimiento)) {
                    throw new Error('Las tarjetas de crédito requieren dia_cierre y dia_vencimiento');
                }
            }
        }
    });
}
