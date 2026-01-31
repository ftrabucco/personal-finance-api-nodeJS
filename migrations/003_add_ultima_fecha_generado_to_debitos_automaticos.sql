-- Migration: Add ultima_fecha_generado field to debitos_automaticos table
-- Date: 2025-09-08
-- Description: Adds ultima_fecha_generado field for tracking last generation date

-- Add the ultima_fecha_generado column
ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS ultima_fecha_generado DATE;

-- Add comment for documentation
COMMENT ON COLUMN finanzas.debitos_automaticos.ultima_fecha_generado IS
'Última fecha en que se generó un gasto a partir de este débito automático';
