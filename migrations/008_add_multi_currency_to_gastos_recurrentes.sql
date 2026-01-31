-- Migration: Add multi-currency support to gastos_recurrentes
-- Purpose: Enable USD/ARS dual currency for recurring expenses
-- Date: 2024-01-15
-- Important: Each time a gasto is generated, it will use the current exchange rate

-- Add new columns to gastos_recurrentes
ALTER TABLE finanzas.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS moneda_origen VARCHAR(3) DEFAULT 'ARS' CHECK (moneda_origen IN ('ARS', 'USD')),
  ADD COLUMN IF NOT EXISTS monto_ars DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tipo_cambio_referencia DECIMAL(10, 2);

-- Add comments
COMMENT ON COLUMN finanzas.gastos_recurrentes.moneda_origen IS 'Moneda en la que se ingresó el gasto recurrente (ARS o USD)';
COMMENT ON COLUMN finanzas.gastos_recurrentes.monto_ars IS 'Monto en pesos argentinos';
COMMENT ON COLUMN finanzas.gastos_recurrentes.monto_usd IS 'Monto en dólares estadounidenses';
COMMENT ON COLUMN finanzas.gastos_recurrentes.tipo_cambio_referencia IS 'Tipo de cambio de referencia inicial (cada gasto generado usará el TC del día)';

-- Migrar datos existentes (solo si hay tipo de cambio disponible)
UPDATE finanzas.gastos_recurrentes
SET
  moneda_origen = 'ARS',
  monto_ars = monto,
  monto_usd = CASE
    WHEN (SELECT valor_venta_usd_ars FROM finanzas.tipos_cambio WHERE activo = true ORDER BY fecha DESC LIMIT 1) IS NOT NULL
    THEN ROUND(monto / (SELECT valor_venta_usd_ars FROM finanzas.tipos_cambio WHERE activo = true ORDER BY fecha DESC LIMIT 1), 2)
    ELSE NULL
  END,
  tipo_cambio_referencia = (
    SELECT valor_venta_usd_ars
    FROM finanzas.tipos_cambio
    WHERE activo = true
    ORDER BY fecha DESC
    LIMIT 1
  )
WHERE monto_ars IS NULL;

-- Success message
SELECT 'Migration 008: Multi-currency support added to gastos_recurrentes' AS status;
