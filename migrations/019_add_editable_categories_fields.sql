-- Migration: Add editable categories fields
-- Purpose: Allow users to create custom categories and hide unused ones
-- Date: 2026-02-28

-- Add new columns to categorias_gasto table
ALTER TABLE finanzas.categorias_gasto
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icono VARCHAR(10);

-- Create index for user-specific category lookups
CREATE INDEX IF NOT EXISTS idx_categorias_gasto_usuario ON finanzas.categorias_gasto(usuario_id);

-- Create index for active categories filter
CREATE INDEX IF NOT EXISTS idx_categorias_gasto_activo ON finanzas.categorias_gasto(activo);

-- Update unique constraint to allow same name per user
-- First, drop the old unique constraint on nombre_categoria
ALTER TABLE finanzas.categorias_gasto DROP CONSTRAINT IF EXISTS categorias_gasto_nombre_categoria_key;

-- Add new unique constraint: nombre_categoria must be unique per user (or unique among system categories where usuario_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_gasto_nombre_usuario
ON finanzas.categorias_gasto (nombre_categoria, COALESCE(usuario_id, -1));

-- Set default icons for existing system categories
UPDATE finanzas.categorias_gasto SET icono = '🏠' WHERE nombre_categoria IN ('Alquiler', 'Expensas', 'Servicios (luz, gas, agua)', 'Internet / Cable', 'Hogar / Mantenimiento');
UPDATE finanzas.categorias_gasto SET icono = '🛒' WHERE nombre_categoria IN ('Supermercado', 'Almacén / Verdulería', 'Delivery / Comida', 'Restaurantes');
UPDATE finanzas.categorias_gasto SET icono = '🚗' WHERE nombre_categoria IN ('Transporte público', 'Combustible', 'Uber / Taxi', 'Mantenimiento vehículo');
UPDATE finanzas.categorias_gasto SET icono = '💊' WHERE nombre_categoria IN ('Farmacia', 'Médicos / Consultas', 'Obra social / Prepaga');
UPDATE finanzas.categorias_gasto SET icono = '🎯' WHERE nombre_categoria IN ('Peluquería / Estética', 'Ropa / Calzado', 'Gimnasio / Deportes');
UPDATE finanzas.categorias_gasto SET icono = '🎮' WHERE nombre_categoria IN ('Streaming / Suscripciones', 'Cine / Teatro', 'Libros / Cursos', 'Hobbies');
UPDATE finanzas.categorias_gasto SET icono = '💳' WHERE nombre_categoria IN ('Tarjetas de crédito', 'Préstamos', 'Seguros', 'Impuestos');
UPDATE finanzas.categorias_gasto SET icono = '👥' WHERE nombre_categoria IN ('Regalos', 'Salidas con amigos', 'Familia');
UPDATE finanzas.categorias_gasto SET icono = '🐕' WHERE nombre_categoria IN ('Veterinario', 'Comida mascotas');
UPDATE finanzas.categorias_gasto SET icono = '💰' WHERE nombre_categoria IN ('Ahorro / Inversión', 'Emergencias', 'Otros');

-- Verify the changes
SELECT id, nombre_categoria, usuario_id, activo, orden, icono
FROM finanzas.categorias_gasto
ORDER BY orden, nombre_categoria
LIMIT 10;

-- Success message
SELECT 'Migration 019: Editable categories fields added' AS status;
