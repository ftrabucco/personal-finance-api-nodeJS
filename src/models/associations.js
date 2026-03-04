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
    Usuario,
    FuenteIngreso,
    IngresoUnico,
    IngresoRecurrente
  } = models;

  // Gasto
  Gasto.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id', as: 'tipoPago' });
  TipoPago.hasMany(Gasto, { foreignKey: 'tipo_pago_id', as: 'gastos' });

  Gasto.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id', as: 'categoria' });
  CategoriaGasto.hasMany(Gasto, { foreignKey: 'categoria_gasto_id', as: 'gastos' });

  Gasto.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id', as: 'frecuencia' });
  FrecuenciaGasto.hasMany(Gasto, { foreignKey: 'frecuencia_gasto_id', as: 'gastos' });

  Gasto.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id', as: 'importancia' });
  ImportanciaGasto.hasMany(Gasto, { foreignKey: 'importancia_gasto_id', as: 'gastos' });

  Gasto.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(Gasto, { foreignKey: 'usuario_id', as: 'gastos' });

  Gasto.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id', as: 'tarjeta' });
  Tarjeta.hasMany(Gasto, { foreignKey: 'tarjeta_id', as: 'gastos' });

  // Compra
  Compra.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id', as: 'tipoPago' });
  TipoPago.hasMany(Compra, { foreignKey: 'tipo_pago_id', as: 'compras' });

  Compra.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id', as: 'categoria' });
  CategoriaGasto.hasMany(Compra, { foreignKey: 'categoria_gasto_id', as: 'compras' });

  Compra.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id', as: 'importancia' });
  ImportanciaGasto.hasMany(Compra, { foreignKey: 'importancia_gasto_id', as: 'compras' });

  Compra.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id', as: 'tarjeta' });
  Tarjeta.hasMany(Compra, { foreignKey: 'tarjeta_id', as: 'compras' });

  Compra.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(Compra, { foreignKey: 'usuario_id', as: 'compras' });

  // Débito Automático
  DebitoAutomatico.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id', as: 'tipoPago' });
  TipoPago.hasMany(DebitoAutomatico, { foreignKey: 'tipo_pago_id', as: 'debitos' });

  DebitoAutomatico.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id', as: 'categoria' });
  CategoriaGasto.hasMany(DebitoAutomatico, { foreignKey: 'categoria_gasto_id', as: 'debitos' });

  DebitoAutomatico.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id', as: 'importancia' });
  ImportanciaGasto.hasMany(DebitoAutomatico, { foreignKey: 'importancia_gasto_id', as: 'debitos' });

  DebitoAutomatico.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id', as: 'frecuencia' });
  FrecuenciaGasto.hasMany(DebitoAutomatico, { foreignKey: 'frecuencia_gasto_id', as: 'debitos' });

  DebitoAutomatico.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id', as: 'tarjeta' });
  Tarjeta.hasMany(DebitoAutomatico, { foreignKey: 'tarjeta_id', as: 'debitos' });

  DebitoAutomatico.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(DebitoAutomatico, { foreignKey: 'usuario_id', as: 'debitosAutomaticos' });

  //Gasto Recurrente
  GastoRecurrente.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id', as: 'tipoPago' });
  TipoPago.hasMany(GastoRecurrente, { foreignKey: 'tipo_pago_id', as: 'gastosRecurrentes' });

  GastoRecurrente.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id', as: 'categoria' });
  CategoriaGasto.hasMany(GastoRecurrente, { foreignKey: 'categoria_gasto_id', as: 'gastosRecurrentes' });

  GastoRecurrente.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id', as: 'importancia' });
  ImportanciaGasto.hasMany(GastoRecurrente, { foreignKey: 'importancia_gasto_id', as: 'gastosRecurrentes' });

  GastoRecurrente.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id', as: 'frecuencia' });
  FrecuenciaGasto.hasMany(GastoRecurrente, { foreignKey: 'frecuencia_gasto_id', as: 'gastosRecurrentes' });

  GastoRecurrente.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id', as: 'tarjeta' });
  Tarjeta.hasMany(GastoRecurrente, { foreignKey: 'tarjeta_id', as: 'gastosRecurrentes' });

  GastoRecurrente.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(GastoRecurrente, { foreignKey: 'usuario_id', as: 'gastosRecurrentes' });

  //Gasto Unico
  GastoUnico.belongsTo(TipoPago, { foreignKey: 'tipo_pago_id', as: 'tipoPago' });
  TipoPago.hasMany(GastoUnico, { foreignKey: 'tipo_pago_id', as: 'gastosUnicos' });

  GastoUnico.belongsTo(CategoriaGasto, { foreignKey: 'categoria_gasto_id', as: 'categoria' });
  CategoriaGasto.hasMany(GastoUnico, { foreignKey: 'categoria_gasto_id', as: 'gastosUnicos' });

  GastoUnico.belongsTo(ImportanciaGasto, { foreignKey: 'importancia_gasto_id', as: 'importancia' });
  ImportanciaGasto.hasMany(GastoUnico, { foreignKey: 'importancia_gasto_id', as: 'gastosUnicos' });

  GastoUnico.belongsTo(Tarjeta, { foreignKey: 'tarjeta_id', as: 'tarjeta' });
  Tarjeta.hasMany(GastoUnico, { foreignKey: 'tarjeta_id', as: 'gastosUnicos' });

  GastoUnico.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(GastoUnico, { foreignKey: 'usuario_id', as: 'gastosUnicos' });

  // Tarjeta
  Tarjeta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(Tarjeta, { foreignKey: 'usuario_id', as: 'tarjetas' });

  // Ingreso Único
  IngresoUnico.belongsTo(FuenteIngreso, { foreignKey: 'fuente_ingreso_id', as: 'fuenteIngreso' });
  FuenteIngreso.hasMany(IngresoUnico, { foreignKey: 'fuente_ingreso_id', as: 'ingresosUnicos' });

  IngresoUnico.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(IngresoUnico, { foreignKey: 'usuario_id', as: 'ingresosUnicos' });

  // Ingreso Recurrente
  IngresoRecurrente.belongsTo(FuenteIngreso, { foreignKey: 'fuente_ingreso_id', as: 'fuenteIngreso' });
  FuenteIngreso.hasMany(IngresoRecurrente, { foreignKey: 'fuente_ingreso_id', as: 'ingresosRecurrentes' });

  IngresoRecurrente.belongsTo(FrecuenciaGasto, { foreignKey: 'frecuencia_gasto_id', as: 'frecuencia' });
  FrecuenciaGasto.hasMany(IngresoRecurrente, { foreignKey: 'frecuencia_gasto_id', as: 'ingresosRecurrentes' });

  IngresoRecurrente.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  Usuario.hasMany(IngresoRecurrente, { foreignKey: 'usuario_id', as: 'ingresosRecurrentes' });

}
