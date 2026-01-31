-- Migration: Ensure all required columns exist on debitos_automaticos
-- Date: 2026-01-31
-- Description: Safety net migration to add any missing columns that may have
-- failed in previous migrations (002, 003, 009) due to partial execution

-- Columns from migration 002/003
ALTER TABLE finanzas.debitos_automaticos
  ADD COLUMN IF NOT EXISTS mes_de_pago INTEGER,
  ADD COLUMN IF NOT EXISTS ultima_fecha_generado DATE;

-- Constraint (ignore if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_debito_mes_de_pago_range'
  ) THEN
    ALTER TABLE finanzas.debitos_automaticos
    ADD CONSTRAINT chk_debito_mes_de_pago_range
    CHECK (mes_de_pago IS NULL OR (mes_de_pago >= 1 AND mes_de_pago <= 12));
  END IF;
END $$;

-- Columns from migration 009 (multi-currency)
ALTER TABLE finanzas.debitos_automaticos
  ADD COLUMN IF NOT EXISTS moneda_origen VARCHAR(3) DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS monto_ars DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tipo_cambio_referencia DECIMAL(10, 2);

-- Set defaults for existing rows
UPDATE finanzas.debitos_automaticos
SET
  moneda_origen = 'ARS',
  monto_ars = monto
WHERE moneda_origen IS NULL OR monto_ars IS NULL;

SELECT 'Migration 013: debitos_automaticos columns verified/fixed' AS status;
