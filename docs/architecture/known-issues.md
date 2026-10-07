# Known Issues

Problemas conocidos, todavía sin corregir. Cuando uno se resuelve, moverlo a la sección "Resueltos" con el PR.

## Abiertos

### Débitos automáticos: el gasto generado pierde `tipo_cambio_usado` y `moneda_origen`

- **Detectado**: 2026-10-03, analizando datos de producción.
- **Estado**: abierto, sin corregir.

**Síntoma**

- Todos los gastos con `tipo_origen = 'debito_automatico'` tienen `tipo_cambio_usado = NULL` (57 de 57 en el usuario analizado). Los gastos de los otros orígenes (`unico`, `recurrente`, `compra`) lo tienen siempre.
- Los débitos definidos en USD (ej. Netflix, Claude IA) generan gastos con `moneda_origen = 'ARS'`, aunque el débito tenga `moneda_origen = 'USD'`.

**Causa probable**

`AutomaticDebitExpenseStrategy` (`src/strategies/expenseGeneration/automaticDebitStrategy.js`, alrededor de las líneas 71-77) arma el gasto con `createGastoData(debitoAutomatico, {...})` y solo pasa `fecha`, `monto_ars`, `monto_usd`, `descripcion` y `frecuencia_gasto_id`. No pasa `moneda_origen` ni `tipo_cambio_usado`.

`BaseRecurringStrategy` (`baseRecurringStrategy.js`, líneas 212-213) sí los pasa:

```js
moneda_origen: source.moneda_origen || 'ARS',
tipo_cambio_usado: source.tipo_cambio_referencia || null,
```

El modelo `DebitoAutomatico` tiene `tipo_cambio_referencia` (cargado en producción), así que el dato existe en la fuente.

**Impacto**

- Los totales en USD de los reportes (`/gastos/summary`, `/balance/evolucion`) para los débitos automáticos no tienen un tipo de cambio de respaldo.
- Los débitos en USD figuran como gastos en ARS, lo que confunde el análisis por moneda.

**Cómo corregirlo (propuesta)**

1. Rama `fix/` desde master. En `automaticDebitStrategy.js`, pasar `moneda_origen: debitoAutomatico.moneda_origen || 'ARS'` y `tipo_cambio_usado: debitoAutomatico.tipo_cambio_referencia || null` a `createGastoData`.
2. Verificar si `createGastoData` en `baseStrategy.js` ya incluye alguno de estos campos por defecto antes de duplicarlos.
3. Agregar un test del generador: un débito en USD debe producir un gasto con `moneda_origen = 'USD'` y `tipo_cambio_usado` igual al `tipo_cambio_referencia`.
4. Decidir si hace falta un backfill de los gastos ya generados. Antes de eso, comprobar si el `monto_usd` histórico de esos gastos es confiable: el monto en ARS se toma del débito al generar y no se recalcula a la fecha del gasto.

**Cómo verificarlo en datos**

```sql
SELECT tipo_origen, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE tipo_cambio_usado IS NULL) AS sin_tipo_cambio
FROM finanzas.gastos
GROUP BY tipo_origen;
```

Antes de la corrección, `debito_automatico` tiene `sin_tipo_cambio = total`.

### Ingresos recurrentes en USD: el equivalente en ARS queda desactualizado y no hay historial por mes

- **Detectado**: 2026-10-04, analizando el ahorro de un usuario que cobra su sueldo en dólares.
- **Estado**: abierto, sin corregir.

**Síntoma**

Un ingreso recurrente en USD (ej. sueldo de USD 3.100) se muestra siempre con el mismo equivalente en ARS en `/balance/evolucion`. En producción figuraba como $4.309.000 todos los meses (USD 3.100 × 1.390, el tipo de cambio del día en que se creó), mientras el dólar ya estaba en 1.560. El ahorro en pesos sale subvaluado (unos $527 mil por mes en ese caso).

**Causas**

1. `ExchangeRateScheduler` actualiza a diario `GastoRecurrente` (`updateRecurringExpensesCurrency`), `DebitoAutomatico` (`updateAutomaticDebitsCurrency`) y `Compra` (`updatePendingInstallmentsCurrency`), pero no `IngresoRecurrente`. El `tipo_cambio_referencia` y el `monto_ars` quedan fijos desde `IngresoRecurrenteService.create`.
2. No existe un generador que materialice los ingresos recurrentes como filas, a diferencia de los gastos. `balance.service.js` (líneas 116-131) suma `rec.monto_ars` de la plantilla recurrente por cada mes que aplica. Aunque la plantilla se actualizara a diario, todos los meses pasados mostrarían el valor de hoy.

**Comportamiento deseado**

El día de pago (`dia_de_pago`) se guarda un registro con el equivalente en ARS usando el tipo de cambio de ese día. Con el tiempo se ve cada mes en pesos y en dólares con su cotización histórica.

**Cómo corregirlo (propuesta)**

1. Crear un generador de ingresos recurrentes con el mismo patrón idempotente de los gastos (índice único `tipo_origen + id_origen + fecha`), ejecutado por el scheduler en `dia_de_pago`. Cada ejecución crea una fila de `ingresos_unico` con `tipo_cambio_usado` del día.
2. Hacer que `balance.service.js` use esas filas para los meses ya generados y la plantilla solo para proyectar meses futuros.
3. Definir qué cotización usar (hoy la app usa el dólar oficial de venta; si el usuario convierte por MEP o blue, el equivalente en pesos es otro).
4. Backfill: los meses anteriores a la corrección no tienen cotización diaria. Decidir si se completan con el tipo de cambio histórico de `tipos_cambio`.

**Cómo verificarlo en datos**

```sql
SELECT descripcion, moneda_origen, monto_usd, monto_ars, tipo_cambio_referencia, fecha_inicio
FROM finanzas.ingresos_recurrentes
WHERE activo = true AND moneda_origen = 'USD';
```

Si `monto_ars / monto_usd` coincide con `tipo_cambio_referencia` de la fecha de creación y no con la cotización actual, el problema está presente.

## Resueltos

_(ninguno todavía)_
