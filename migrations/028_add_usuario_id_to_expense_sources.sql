-- Migration: Add usuario_id to expense source tables
-- Purpose: Add ownership columns without guessing ownership of existing prod data
-- Date: 2026-07-27

ALTER TABLE finanzas.compras
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE;

ALTER TABLE finanzas.gastos_unico
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE;

ALTER TABLE finanzas.gastos_recurrentes
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE;

ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE;

ALTER TABLE finanzas.debitos_automaticos
ADD COLUMN IF NOT EXISTS cuenta_bancaria_id INTEGER REFERENCES finanzas.cuentas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compras_usuario_id
ON finanzas.compras(usuario_id);

CREATE INDEX IF NOT EXISTS idx_gastos_unico_usuario_id
ON finanzas.gastos_unico(usuario_id);

CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_usuario_id
ON finanzas.gastos_recurrentes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_debitos_automaticos_usuario_id
ON finanzas.debitos_automaticos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_debitos_automaticos_cuenta_bancaria_id
ON finanzas.debitos_automaticos(cuenta_bancaria_id);

SELECT 'Migration 028: nullable usuario_id added to expense source tables' AS status;
