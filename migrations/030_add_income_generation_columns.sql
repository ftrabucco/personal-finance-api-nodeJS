-- Supports generating dated IngresoUnico occurrences from an
-- IngresoRecurrente, mirroring how Gasto rows are generated from
-- GastoRecurrente/DebitoAutomatico/Compra — see
-- docs/architecture/known-issues.md ("Ingresos recurrentes en USD...").
--
-- ingreso_recurrente_id: NULL for a genuinely manual one-time income;
-- non-null marks the row as a generated occurrence of that recurring
-- income, snapshotted with that month's historical exchange rate.
--
-- ultima_fecha_generado: mirrors GastoRecurrente's column of the same
-- name, used by the generator to avoid re-checking a source that was
-- already generated for the current period.
ALTER TABLE finanzas.ingresos_recurrentes
  ADD COLUMN IF NOT EXISTS ultima_fecha_generado DATE NULL;

ALTER TABLE finanzas.ingresos_unico
  ADD COLUMN IF NOT EXISTS ingreso_recurrente_id INTEGER NULL
    REFERENCES finanzas.ingresos_recurrentes(id);

-- Partial index: a single recurring income can never legitimately generate
-- two occurrences on the same date (same reasoning as
-- 029_unique_index_gastos_origen_fecha.sql). Manually created ingresos
-- únicos have NULL ingreso_recurrente_id, so this only constrains
-- generation-sourced rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingresos_unico_unique_origen_fecha
  ON finanzas.ingresos_unico (ingreso_recurrente_id, fecha)
  WHERE ingreso_recurrente_id IS NOT NULL;
