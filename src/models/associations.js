export function setupAssociations(models) {
    const {
        Gasto,
        TipoPago,
        CategoriaGasto,
        FrecuenciaGasto,
        ImportanciaGasto,
        Compra,
        DebitoAutomatico,
        GastoRecurrente,
        GastoUnico,
        Tarjeta,
        Usuario
    } = models;

    Gasto.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(Gasto, { foreignKey: 'tipo_pago_id' });

    Gasto.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id' });
    CategoriaGasto.hasMany(Gasto, { foreignKey: 'categoria_gasto_id' });

    Gasto.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id' });
    FrecuenciaGasto.hasMany(Gasto, { foreignKey: 'frecuencia_gasto_id' });

    Gasto.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id' });
    ImportanciaGasto.hasMany(Gasto, { foreignKey: 'importancia_gasto_id' });

    Gasto.belongsTo(Usuario,  { foreignKey: 'importancia_gasto_id' });
    Usuario.hasMany(Gasto, { foreignKey: 'importancia_gasto_id' });

    // Compra
    Compra.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(Compra, { foreignKey: 'tipo_pago_id' });

    Compra.belongsTo(CategoriaGasto, { foreignKey: 'categoria_id' });
    CategoriaGasto.hasMany(Compra, { foreignKey: 'categoria_id' });

    Compra.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_id' });
    ImportanciaGasto.hasMany(Compra, { foreignKey: 'importancia_id' });

    // Débito Automático
    DebitoAutomatico.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(DebitoAutomatico, { foreignKey: 'tipo_pago_id' });

    DebitoAutomatico.belongsTo(CategoriaGasto, { foreignKey: 'categoria_id' });
    CategoriaGasto.hasMany(DebitoAutomatico, { foreignKey: 'categoria_id' });

    DebitoAutomatico.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_id' });
    ImportanciaGasto.hasMany(DebitoAutomatico, { foreignKey: 'importancia_id' });

    DebitoAutomatico.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id' });
    FrecuenciaGasto.hasMany(DebitoAutomatico, { foreignKey: 'frecuencia_gasto_id' });

    DebitoAutomatico.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id' });
    ImportanciaGasto.hasMany(DebitoAutomatico, { foreignKey: 'tarjeta_id' });

    //Gasto Recurrente
    GastoRecurrente.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(GastoRecurrente, { foreignKey: 'tipo_pago_id' });

    GastoRecurrente.belongsTo(CategoriaGasto, { foreignKey: 'categoria_id' });
    CategoriaGasto.hasMany(GastoRecurrente, { foreignKey: 'categoria_id' });

    GastoRecurrente.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_id' });
    ImportanciaGasto.hasMany(GastoRecurrente, { foreignKey: 'importancia_id' });

    GastoRecurrente.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id' });
    ImportanciaGasto.hasMany(GastoRecurrente, { foreignKey: 'tarjeta_id' });

    //Gasto Unico
    GastoUnico.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id' });
    TipoPago.hasMany(GastoUnico, { foreignKey: 'tipo_pago_id' });

    GastoUnico.belongsTo(CategoriaGasto, { foreignKey: 'categoria_id' });
    CategoriaGasto.hasMany(GastoUnico, { foreignKey: 'categoria_id' });

    GastoUnico.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_id' });
    ImportanciaGasto.hasMany(GastoUnico, { foreignKey: 'importancia_id' });

    GastoUnico.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id' });
    ImportanciaGasto.hasMany(GastoUnico, { foreignKey: 'tarjeta_id' });

}
