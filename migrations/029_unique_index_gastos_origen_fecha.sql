-- Defense-in-depth against duplicate scheduled-generation rows: with the
-- concurrency fix (personal-finance-api-nodeJS PR #39), two overlapping
-- /gastos/generate calls can no longer both insert a gasto for the same
-- cuota/occurrence, but this constraint makes it impossible at the DB level
-- regardless of any future code path that might reintroduce the race.
--
-- A single compra/gasto recurrente/débito automático can never legitimately
-- generate two gastos on the same date: each cuota/occurrence's date is
-- always fecha_compra (or the source's due-date cycle) plus a whole number
-- of months from the previous one, so distinct cuota numbers always land in
-- distinct calendar months.
--
-- Partial index: manually created gastos via POST /gastos can have NULL
-- tipo_origen/id_origen, so this only constrains generation-sourced rows.
--
-- NOTE: this will fail (logged, non-fatal, retried on next boot per
-- migrate.js) on any database that still has pre-existing duplicate rows —
-- clean those up first with a one-off script before this can apply. Applied
-- and verified locally after removing 83 duplicate rows found there.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gastos_unique_origen_fecha
  ON finanzas.gastos (tipo_origen, id_origen, fecha)
  WHERE tipo_origen IS NOT NULL AND id_origen IS NOT NULL;
