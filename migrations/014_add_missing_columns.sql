-- Migration: Add all missing columns across tables
-- Date: 2026-01-31
-- Description: Catches columns that were in models but never had migration files
-- These were previously created by Sequelize alter:true in development only

-- debitos_automaticos: fecha_fin (never migrated)
ALTER TABLE finanzas.debitos_automaticos
  ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- gastos_recurrentes: ultima_fecha_generado (was in original schema but adding as safety)
ALTER TABLE finanzas.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS ultima_fecha_generado DATE;

-- tarjetas: ultimos_4_digitos (never migrated)
ALTER TABLE finanzas.tarjetas
  ADD COLUMN IF NOT EXISTS ultimos_4_digitos VARCHAR(4);

-- tarjetas: ensure both column name variants exist (model uses dia_mes_*, migration 004 created dia_*)
ALTER TABLE finanzas.tarjetas
  ADD COLUMN IF NOT EXISTS dia_mes_cierre INTEGER,
  ADD COLUMN IF NOT EXISTS dia_mes_vencimiento INTEGER;

-- Sync dia_mes_* from dia_* if they exist and dia_mes_* are null
UPDATE finanzas.tarjetas
SET
  dia_mes_cierre = dia_cierre,
  dia_mes_vencimiento = dia_vencimiento
WHERE dia_mes_cierre IS NULL
  AND dia_cierre IS NOT NULL;

SELECT 'Migration 014: All missing columns added' AS status;
