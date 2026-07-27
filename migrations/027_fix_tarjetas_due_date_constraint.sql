-- Migration: Fix tarjetas due date constraint
-- Purpose: Validate the dia_mes_* columns used by the Tarjeta model and seed data
-- Date: 2026-07-27

UPDATE finanzas.tarjetas
SET
  dia_mes_cierre = COALESCE(dia_mes_cierre, dia_cierre),
  dia_mes_vencimiento = COALESCE(dia_mes_vencimiento, dia_vencimiento)
WHERE dia_cierre IS NOT NULL
   OR dia_vencimiento IS NOT NULL;

UPDATE finanzas.tarjetas
SET
  dia_cierre = COALESCE(dia_cierre, dia_mes_cierre),
  dia_vencimiento = COALESCE(dia_vencimiento, dia_mes_vencimiento)
WHERE dia_mes_cierre IS NOT NULL
   OR dia_mes_vencimiento IS NOT NULL;

ALTER TABLE finanzas.tarjetas
DROP CONSTRAINT IF EXISTS chk_credito_requiere_fechas;

ALTER TABLE finanzas.tarjetas
ADD CONSTRAINT chk_credito_requiere_fechas
CHECK (
  tipo <> 'credito'
  OR (
    dia_mes_cierre IS NOT NULL
    AND dia_mes_vencimiento IS NOT NULL
  )
);

SELECT 'Migration 027: tarjetas due date constraint fixed' AS status;
