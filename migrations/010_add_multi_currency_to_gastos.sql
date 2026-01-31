-- ================================================
-- Migration: 010_add_multi_currency_to_gastos.sql
-- Description: Añade campos multi-moneda a tabla gastos
-- Author: Sistema Multi-Moneda USD/ARS
-- Date: 2024-10-17
-- ================================================

-- Tabla: finanzas.gastos (gastos reales generados)
-- Añadir campos para sistema multi-moneda:
-- - moneda_origen: Moneda en que se ingresó el gasto originalmente
-- - tipo_cambio_usado: Snapshot del tipo de cambio usado para conversión

-- ================================================
-- 1. Agregar campo moneda_origen
-- ================================================
ALTER TABLE finanzas.gastos
ADD COLUMN IF NOT EXISTS moneda_origen VARCHAR(3) DEFAULT 'ARS' CHECK (moneda_origen IN ('ARS', 'USD'));

COMMENT ON COLUMN finanzas.gastos.moneda_origen IS 'Moneda en la que se ingresó originalmente el gasto (ARS o USD)';

-- ================================================
-- 2. Agregar campo tipo_cambio_usado
-- ================================================
ALTER TABLE finanzas.gastos
ADD COLUMN IF NOT EXISTS tipo_cambio_usado NUMERIC(10,2);

COMMENT ON COLUMN finanzas.gastos.tipo_cambio_usado IS 'Tipo de cambio usado para la conversión (snapshot histórico para integridad temporal)';

-- ================================================
-- 3. Crear índice para consultas por moneda
-- ================================================
CREATE INDEX IF NOT EXISTS idx_gastos_moneda_origen
ON finanzas.gastos(moneda_origen);

-- ================================================
-- 4. Actualizar registros existentes (backward compatibility)
-- ================================================
-- Todos los gastos existentes se asumen en ARS por defecto
UPDATE finanzas.gastos
SET moneda_origen = 'ARS'
WHERE moneda_origen IS NULL;

-- Para gastos existentes sin tipo_cambio_usado, dejarlo NULL
-- (no podemos calcular retrospectivamente el TC usado)

-- ================================================
-- FIN DE MIGRACIÓN
-- ================================================
