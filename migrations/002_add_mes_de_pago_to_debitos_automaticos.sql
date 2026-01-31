-- Migration: Add mes_de_pago field to debitos_automaticos table
-- Date: 2025-09-08
-- Description: Adds mes_de_pago field for annual frequency support in automatic debits

-- Add the mes_de_pago column
ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS mes_de_pago INTEGER;

-- Add the ultima_fecha_generado column
ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS ultima_fecha_generado DATE;

-- Add check constraint for valid month range (1-12)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_debito_mes_de_pago_range') THEN
    ALTER TABLE finanzas.debitos_automaticos
    ADD CONSTRAINT chk_debito_mes_de_pago_range
    CHECK (mes_de_pago IS NULL OR (mes_de_pago >= 1 AND mes_de_pago <= 12));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN finanzas.debitos_automaticos.mes_de_pago IS
'Mes específico para débitos anuales (1-12). NULL para otras frecuencias';

COMMENT ON COLUMN finanzas.debitos_automaticos.ultima_fecha_generado IS
'Última fecha en que se generó un gasto a partir de este débito automático';
