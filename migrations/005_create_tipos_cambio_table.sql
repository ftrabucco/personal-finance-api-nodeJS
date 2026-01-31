-- Migration: Create tipos_cambio table
-- Purpose: Store historical exchange rates (USD-ARS) for multi-currency support
-- Date: 2024-01-15

-- Create tipos_cambio table
CREATE TABLE IF NOT EXISTS finanzas.tipos_cambio (
  fecha DATE PRIMARY KEY,
  valor_compra_usd_ars DECIMAL(10, 2) NOT NULL CHECK (valor_compra_usd_ars >= 0.01),
  valor_venta_usd_ars DECIMAL(10, 2) NOT NULL CHECK (valor_venta_usd_ars >= 0.01),
  fuente VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (fuente IN ('manual', 'api_bcra', 'api_dolar_api', 'api_otros')),
  observaciones VARCHAR(500),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: venta debe ser >= compra
  CONSTRAINT check_venta_mayor_compra CHECK (valor_venta_usd_ars >= valor_compra_usd_ars)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_fecha ON finanzas.tipos_cambio(fecha);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_activo ON finanzas.tipos_cambio(activo, fecha);

-- Add comments
COMMENT ON TABLE finanzas.tipos_cambio IS 'Histórico de tipos de cambio USD-ARS para conversión automática de gastos';
COMMENT ON COLUMN finanzas.tipos_cambio.fecha IS 'Fecha del tipo de cambio (PK) - un registro por día';
COMMENT ON COLUMN finanzas.tipos_cambio.valor_compra_usd_ars IS 'Cotización de compra: cuántos ARS se pagan por 1 USD';
COMMENT ON COLUMN finanzas.tipos_cambio.valor_venta_usd_ars IS 'Cotización de venta: cuántos ARS se reciben por 1 USD';
COMMENT ON COLUMN finanzas.tipos_cambio.fuente IS 'Origen del tipo de cambio: manual o API externa';
COMMENT ON COLUMN finanzas.tipos_cambio.activo IS 'Indica si es el tipo de cambio válido para usar';

-- Insert initial exchange rate (example - update with real values)
INSERT INTO finanzas.tipos_cambio (fecha, valor_compra_usd_ars, valor_venta_usd_ars, fuente, observaciones)
VALUES
  (CURRENT_DATE, 1000.00, 1050.00, 'manual', 'Tipo de cambio inicial - actualizar con valores reales')
ON CONFLICT (fecha) DO NOTHING;

-- Success message
SELECT 'Migration 005: tipos_cambio table created successfully' AS status;
