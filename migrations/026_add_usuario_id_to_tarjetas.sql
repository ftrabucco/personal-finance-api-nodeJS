-- Migration: Add usuario_id to tarjetas
-- Purpose: Add ownership column for cards without guessing ownership of existing prod data
-- Date: 2026-07-27

ALTER TABLE finanzas.tarjetas
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tarjetas_usuario_id
ON finanzas.tarjetas(usuario_id);

SELECT 'Migration 026: nullable usuario_id added to tarjetas' AS status;
