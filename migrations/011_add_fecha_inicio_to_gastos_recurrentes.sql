-- Migration: Add fecha_inicio to gastos_recurrentes
-- Purpose: Allow recurring expenses to have a start date (expenses won't generate before this date)
-- Date: 2026-01-28
-- Fixes: Bug where expenses were generated immediately regardless of intended start date

-- Add fecha_inicio column
ALTER TABLE finanzas.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

-- Add comment
COMMENT ON COLUMN finanzas.gastos_recurrentes.fecha_inicio IS 'Fecha a partir de la cual se empezará a generar el gasto recurrente';

-- Success message
SELECT 'Migration 011: fecha_inicio column added to gastos_recurrentes' AS status;
