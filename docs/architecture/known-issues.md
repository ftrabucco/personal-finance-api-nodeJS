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

## Resueltos

_(ninguno todavía)_
