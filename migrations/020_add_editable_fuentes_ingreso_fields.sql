-- Migration: Add editable fuentes_ingreso fields
-- Purpose: Allow users to create custom income sources and hide unused ones
-- Date: 2026-02-28

-- Add new columns to fuentes_ingreso table
ALTER TABLE finanzas.fuentes_ingreso
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icono VARCHAR(10);

-- Create index for user-specific fuente lookups
CREATE INDEX IF NOT EXISTS idx_fuentes_ingreso_usuario ON finanzas.fuentes_ingreso(usuario_id);

-- Create index for active fuentes filter
CREATE INDEX IF NOT EXISTS idx_fuentes_ingreso_activo ON finanzas.fuentes_ingreso(activo);

-- Update unique constraint to allow same name per user
-- First, drop the old unique constraint on nombre
ALTER TABLE finanzas.fuentes_ingreso DROP CONSTRAINT IF EXISTS fuentes_ingreso_nombre_key;

-- Add new unique constraint: nombre must be unique per user (or unique among system sources where usuario_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fuentes_ingreso_nombre_usuario
ON finanzas.fuentes_ingreso (nombre, COALESCE(usuario_id, -1));

-- Set default icons for existing system fuentes
UPDATE finanzas.fuentes_ingreso SET icono = '💼' WHERE nombre = 'Sueldo';
UPDATE finanzas.fuentes_ingreso SET icono = '💻' WHERE nombre = 'Freelance';
UPDATE finanzas.fuentes_ingreso SET icono = '📈' WHERE nombre = 'Inversiones';
UPDATE finanzas.fuentes_ingreso SET icono = '🏠' WHERE nombre = 'Alquiler';
UPDATE finanzas.fuentes_ingreso SET icono = '💰' WHERE nombre = 'Otro';

-- Verify the changes
SELECT id, nombre, usuario_id, activo, orden, icono
FROM finanzas.fuentes_ingreso
ORDER BY orden, nombre;

-- Success message
SELECT 'Migration 020: Editable fuentes_ingreso fields added' AS status;
