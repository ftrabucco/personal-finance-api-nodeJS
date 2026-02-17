-- Migration: Simplify importancias to 3 levels
-- Purpose: Reduce from 5 mixed-language levels to 3 Spanish levels
-- Old: Esencial (1), Importante (2), Nice to have (3), Prescindible (4), No debería (5)
-- New: Necesario (1), Deseado (2), Prescindible (3)
-- Date: 2026-02-16

-- Mapping:
--   Esencial (1) + Importante (2) -> Necesario (1)
--   Nice to have (3) -> Deseado (2)
--   Prescindible (4) + No debería (5) -> Prescindible (3)

-- Step 1: Map Importante (2) -> 1 (will become Necesario)
UPDATE finanzas.gastos SET importancia_gasto_id = 1 WHERE importancia_gasto_id = 2;
UPDATE finanzas.gastos_unico SET importancia_gasto_id = 1 WHERE importancia_gasto_id = 2;
UPDATE finanzas.gastos_recurrentes SET importancia_gasto_id = 1 WHERE importancia_gasto_id = 2;
UPDATE finanzas.debitos_automaticos SET importancia_gasto_id = 1 WHERE importancia_gasto_id = 2;
UPDATE finanzas.compras SET importancia_gasto_id = 1 WHERE importancia_gasto_id = 2;

-- Step 2: Map Nice to have (3) -> 2 (will become Deseado)
UPDATE finanzas.gastos SET importancia_gasto_id = 2 WHERE importancia_gasto_id = 3;
UPDATE finanzas.gastos_unico SET importancia_gasto_id = 2 WHERE importancia_gasto_id = 3;
UPDATE finanzas.gastos_recurrentes SET importancia_gasto_id = 2 WHERE importancia_gasto_id = 3;
UPDATE finanzas.debitos_automaticos SET importancia_gasto_id = 2 WHERE importancia_gasto_id = 3;
UPDATE finanzas.compras SET importancia_gasto_id = 2 WHERE importancia_gasto_id = 3;

-- Step 3: Map Prescindible (4) -> 3 (will become Prescindible)
UPDATE finanzas.gastos SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 4;
UPDATE finanzas.gastos_unico SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 4;
UPDATE finanzas.gastos_recurrentes SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 4;
UPDATE finanzas.debitos_automaticos SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 4;
UPDATE finanzas.compras SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 4;

-- Step 4: Map No debería (5) -> 3 (merge with Prescindible)
UPDATE finanzas.gastos SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 5;
UPDATE finanzas.gastos_unico SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 5;
UPDATE finanzas.gastos_recurrentes SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 5;
UPDATE finanzas.debitos_automaticos SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 5;
UPDATE finanzas.compras SET importancia_gasto_id = 3 WHERE importancia_gasto_id = 5;

-- Step 5: Delete unused importancias FIRST (before renaming to avoid UNIQUE constraint conflicts)
DELETE FROM finanzas.importancias_gasto WHERE id = 4;
DELETE FROM finanzas.importancias_gasto WHERE id = 5;

-- Step 6: Now rename the importancias (safe now that "Prescindible" name is freed)
UPDATE finanzas.importancias_gasto SET nombre_importancia = 'Necesario' WHERE id = 1;
UPDATE finanzas.importancias_gasto SET nombre_importancia = 'Deseado' WHERE id = 2;
UPDATE finanzas.importancias_gasto SET nombre_importancia = 'Prescindible' WHERE id = 3;

-- Verify final state
SELECT id, nombre_importancia FROM finanzas.importancias_gasto ORDER BY id;

SELECT 'Migration 017: Importancias simplified to 3 levels (Necesario, Deseado, Prescindible)' AS status;
