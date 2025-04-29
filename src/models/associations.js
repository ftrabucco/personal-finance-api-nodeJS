export function setupAssociations(models) {
    const { Gasto, TipoPago, CategoriaGasto, FrecuenciaGasto, ImportanciaGasto } = models;

    Gasto.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(Gasto, { foreignKey: 'tipo_pago_id' });

    Gasto.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id' });
    CategoriaGasto.hasMany(Gasto, { foreignKey: 'categoria_gasto_id' });

    Gasto.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id' });
    FrecuenciaGasto.hasMany(Gasto, { foreignKey: 'frecuencia_gasto_id' });

    Gasto.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id' });
    ImportanciaGasto.hasMany(Gasto, { foreignKey: 'importancia_gasto_id' });
}
