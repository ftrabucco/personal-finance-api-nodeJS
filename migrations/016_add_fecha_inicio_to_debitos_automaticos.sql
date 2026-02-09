-- Migration: Add fecha_inicio to debitos_automaticos
-- Purpose: Allow automatic debits to have a start date (debits won't generate before this date)
-- Date: 2026-02-03

ALTER TABLE finanzas.debitos_automaticos
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

COMMENT ON COLUMN finanzas.debitos_automaticos.fecha_inicio IS 'Fecha a partir de la cual se empezará a generar el débito automático';

SELECT 'Migration 016: fecha_inicio column added to debitos_automaticos' AS status;
