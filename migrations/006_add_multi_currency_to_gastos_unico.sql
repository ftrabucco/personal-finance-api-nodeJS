-- Migration: Add multi-currency support to gastos_unico
-- Purpose: Enable USD/ARS dual currency with automatic conversion
-- Date: 2024-01-15

-- Add new columns to gastos_unico
ALTER TABLE finanzas.gastos_unico
  ADD COLUMN IF NOT EXISTS moneda_origen VARCHAR(3) DEFAULT 'ARS' CHECK (moneda_origen IN ('ARS', 'USD')),
  ADD COLUMN IF NOT EXISTS monto_ars DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tipo_cambio_usado DECIMAL(10, 2);

-- Add comments
COMMENT ON COLUMN finanzas.gastos_unico.moneda_origen IS 'Moneda en la que se ingresó el gasto originalmente (ARS o USD)';
COMMENT ON COLUMN finanzas.gastos_unico.monto_ars IS 'Monto en pesos argentinos (calculado automáticamente si moneda_origen=USD)';
COMMENT ON COLUMN finanzas.gastos_unico.monto_usd IS 'Monto en dólares estadounidenses (calculado automáticamente si moneda_origen=ARS)';
COMMENT ON COLUMN finanzas.gastos_unico.tipo_cambio_usado IS 'Tipo de cambio usado para la conversión (snapshot para integridad histórica)';

-- Migrar datos existentes: asumir que todo lo existente es ARS
-- y calcular USD usando el tipo de cambio actual
UPDATE finanzas.gastos_unico
SET
  moneda_origen = 'ARS',
  monto_ars = monto,
  monto_usd = ROUND(monto / (
    SELECT valor_venta_usd_ars
    FROM finanzas.tipos_cambio
    WHERE activo = true
    ORDER BY fecha DESC
    LIMIT 1
  ), 2),
  tipo_cambio_usado = (
    SELECT valor_venta_usd_ars
    FROM finanzas.tipos_cambio
    WHERE activo = true
    ORDER BY fecha DESC
    LIMIT 1
  )
WHERE monto_ars IS NULL;

-- Add NOT NULL constraints after migration
ALTER TABLE finanzas.gastos_unico
  ALTER COLUMN moneda_origen SET NOT NULL,
  ALTER COLUMN monto_ars SET NOT NULL,
  ALTER COLUMN monto_usd SET NOT NULL;

-- Success message
SELECT 'Migration 006: Multi-currency support added to gastos_unico' AS status;
