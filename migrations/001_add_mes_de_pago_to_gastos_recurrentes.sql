-- Migration: Add mes_de_pago field to gastos_recurrentes table
-- Date: 2025-09-08
-- Description: Adds mes_de_pago field for annual frequency support in recurring expenses

-- Add the mes_de_pago column
ALTER TABLE finanzas.gastos_recurrentes 
ADD COLUMN mes_de_pago INTEGER;

-- Add check constraint for valid month range (1-12)
ALTER TABLE finanzas.gastos_recurrentes 
ADD CONSTRAINT chk_mes_de_pago_range 
CHECK (mes_de_pago IS NULL OR (mes_de_pago >= 1 AND mes_de_pago <= 12));

-- Add comment for documentation
COMMENT ON COLUMN finanzas.gastos_recurrentes.mes_de_pago IS 
'Mes específico para gastos anuales (1-12). NULL para otras frecuencias';

-- Update existing records to have NULL mes_de_pago (safe default)
UPDATE finanzas.gastos_recurrentes SET mes_de_pago = NULL WHERE mes_de_pago IS NULL;

COMMIT;