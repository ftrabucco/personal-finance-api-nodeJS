import { DataTypes } from 'sequelize';

export function defineGastoUnico(sequelize) {
    return sequelize.define('GastoUnico', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        descripcion: { type: DataTypes.STRING, allowNull: false },
        monto: { type: DataTypes.FLOAT, allowNull: false },
        fecha: { type: DataTypes.DATEONLY, allowNull: false },
        categoria_gasto_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categorias_gasto', key: 'id' } },
        importancia_gasto_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'importancias_gasto', key: 'id' } },
        tipo_pago_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tipos_pago', key: 'id' } },
        tarjeta_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tarjetas', key: 'id' } },
        procesado: { 
            type: DataTypes.BOOLEAN, 
            allowNull: false, 
            defaultValue: false,
            comment: 'Indica si el gasto único ya fue procesado y convertido a un Gasto'
        }
    }, {
        tableName: 'gastos_unico',
        timestamps: false,
    });
}
