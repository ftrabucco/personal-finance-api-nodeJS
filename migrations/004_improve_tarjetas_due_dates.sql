-- Migration: Improve tarjetas due date fields for credit cards
-- Date: 2025-09-08
-- Description: Convert date fields to integers and make them required for credit cards

-- First, drop existing date columns
ALTER TABLE finanzas.tarjetas
DROP COLUMN IF EXISTS dia_mes_cierre,
DROP COLUMN IF EXISTS dia_mes_vencimiento;

-- Add new integer fields for day of month (1-31)
ALTER TABLE finanzas.tarjetas
ADD COLUMN IF NOT EXISTS dia_cierre INTEGER,
ADD COLUMN IF NOT EXISTS dia_vencimiento INTEGER;

-- Add check constraints for valid day ranges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tarjeta_dia_cierre_range') THEN
    ALTER TABLE finanzas.tarjetas
    ADD CONSTRAINT chk_tarjeta_dia_cierre_range
    CHECK (dia_cierre IS NULL OR (dia_cierre >= 1 AND dia_cierre <= 31));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tarjeta_dia_vencimiento_range') THEN
    ALTER TABLE finanzas.tarjetas
    ADD CONSTRAINT chk_tarjeta_dia_vencimiento_range
    CHECK (dia_vencimiento IS NULL OR (dia_vencimiento >= 1 AND dia_vencimiento <= 31));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_credito_requiere_fechas') THEN
    ALTER TABLE finanzas.tarjetas
    ADD CONSTRAINT chk_credito_requiere_fechas
    CHECK (
      (tipo != 'credito') OR
      (tipo = 'credito' AND dia_cierre IS NOT NULL AND dia_vencimiento IS NOT NULL)
    );
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN finanzas.tarjetas.dia_cierre IS
'Día del mes de cierre de tarjeta de crédito (1-31). Requerido para tipo credito';

COMMENT ON COLUMN finanzas.tarjetas.dia_vencimiento IS
'Día del mes de vencimiento de tarjeta de crédito (1-31). Requerido para tipo credito';

-- Update existing records: set sample dates for credit cards
UPDATE finanzas.tarjetas
SET dia_cierre = 15, dia_vencimiento = 25
WHERE tipo = 'credito' AND dia_cierre IS NULL;
