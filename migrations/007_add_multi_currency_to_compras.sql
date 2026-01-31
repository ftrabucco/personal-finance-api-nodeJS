-- Migration: Add multi-currency support to compras
-- Purpose: Enable USD/ARS dual currency for installment purchases
-- Date: 2024-01-15

-- Add new columns to compras
ALTER TABLE finanzas.compras
  ADD COLUMN IF NOT EXISTS moneda_origen VARCHAR(3) DEFAULT 'ARS' CHECK (moneda_origen IN ('ARS', 'USD')),
  ADD COLUMN IF NOT EXISTS monto_total_ars DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS monto_total_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tipo_cambio_usado DECIMAL(10, 2);

-- Add comments
COMMENT ON COLUMN finanzas.compras.moneda_origen IS 'Moneda en la que se ingresó la compra originalmente (ARS o USD)';
COMMENT ON COLUMN finanzas.compras.monto_total_ars IS 'Monto total en pesos argentinos';
COMMENT ON COLUMN finanzas.compras.monto_total_usd IS 'Monto total en dólares estadounidenses';
COMMENT ON COLUMN finanzas.compras.tipo_cambio_usado IS 'Tipo de cambio usado para la conversión (snapshot)';

-- Migrar datos existentes
UPDATE finanzas.compras
SET
  moneda_origen = 'ARS',
  monto_total_ars = monto_total,
  monto_total_usd = ROUND(monto_total / (
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
WHERE monto_total_ars IS NULL;

-- Add NOT NULL constraints
ALTER TABLE finanzas.compras
  ALTER COLUMN moneda_origen SET NOT NULL,
  ALTER COLUMN monto_total_ars SET NOT NULL,
  ALTER COLUMN monto_total_usd SET NOT NULL;

-- Success message
SELECT 'Migration 007: Multi-currency support added to compras' AS status;
