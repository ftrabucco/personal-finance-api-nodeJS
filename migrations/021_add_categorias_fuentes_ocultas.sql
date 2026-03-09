-- Migration: Add categorias_ocultas and fuentes_ocultas to preferencias_usuario
-- Date: 2026-03-09
-- Description: Allows users to hide system categories and income sources

-- Add categorias_ocultas column
ALTER TABLE finanzas.preferencias_usuario
ADD COLUMN IF NOT EXISTS categorias_ocultas JSONB NOT NULL DEFAULT '[]';

-- Add fuentes_ocultas column
ALTER TABLE finanzas.preferencias_usuario
ADD COLUMN IF NOT EXISTS fuentes_ocultas JSONB NOT NULL DEFAULT '[]';

-- Add comments
COMMENT ON COLUMN finanzas.preferencias_usuario.categorias_ocultas IS 'IDs de categorias del sistema que el usuario quiere ocultar';
COMMENT ON COLUMN finanzas.preferencias_usuario.fuentes_ocultas IS 'IDs de fuentes de ingreso del sistema que el usuario quiere ocultar';
