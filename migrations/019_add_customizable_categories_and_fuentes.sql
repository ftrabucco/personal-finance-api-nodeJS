-- Migration: Add customizable categories and income sources
-- Allows users to create their own categories and income sources while keeping system defaults

-- ============================================
-- 1. ADD NEW COLUMNS TO categorias_gasto
-- ============================================
ALTER TABLE finanzas.categorias_gasto
ADD COLUMN IF NOT EXISTS icono VARCHAR(10) DEFAULT '📦',
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id),
ADD COLUMN IF NOT EXISTS es_sistema BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS orden INTEGER;

-- Mark all existing categories as system categories
UPDATE finanzas.categorias_gasto
SET es_sistema = true, activo = true
WHERE usuario_id IS NULL;

-- Drop old unique constraint if exists
ALTER TABLE finanzas.categorias_gasto DROP CONSTRAINT IF EXISTS categorias_gasto_nombre_categoria_key;

-- Create new composite unique index (name + user)
DROP INDEX IF EXISTS finanzas.categorias_nombre_usuario_unique;
CREATE UNIQUE INDEX categorias_nombre_usuario_unique
ON finanzas.categorias_gasto (nombre_categoria, COALESCE(usuario_id, -1));

-- Add default icons to existing system categories
UPDATE finanzas.categorias_gasto SET icono = '🏠', orden = 1 WHERE nombre_categoria = 'Alquiler' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🏢', orden = 2 WHERE nombre_categoria = 'Expensas' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '💡', orden = 3 WHERE nombre_categoria = 'Servicios (luz, gas, agua)' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '📶', orden = 4 WHERE nombre_categoria = 'Internet / Cable' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🔧', orden = 5 WHERE nombre_categoria = 'Hogar / Mantenimiento' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🛒', orden = 6 WHERE nombre_categoria = 'Supermercado' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🥬', orden = 7 WHERE nombre_categoria = 'Almacén / Verdulería' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🍕', orden = 8 WHERE nombre_categoria = 'Delivery / Comida' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🍽️', orden = 9 WHERE nombre_categoria = 'Restaurantes' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🚌', orden = 10 WHERE nombre_categoria = 'Transporte público' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '⛽', orden = 11 WHERE nombre_categoria = 'Combustible' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🚕', orden = 12 WHERE nombre_categoria = 'Uber / Taxi' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🔧', orden = 13 WHERE nombre_categoria = 'Mantenimiento vehículo' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '💊', orden = 14 WHERE nombre_categoria = 'Farmacia' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🏥', orden = 15 WHERE nombre_categoria = 'Médicos / Consultas' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🏥', orden = 16 WHERE nombre_categoria = 'Obra social / Prepaga' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '💇', orden = 17 WHERE nombre_categoria = 'Peluquería / Estética' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '👕', orden = 18 WHERE nombre_categoria = 'Ropa / Calzado' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🏋️', orden = 19 WHERE nombre_categoria = 'Gimnasio / Deportes' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '📺', orden = 20 WHERE nombre_categoria = 'Streaming / Suscripciones' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🎬', orden = 21 WHERE nombre_categoria = 'Cine / Teatro' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '📚', orden = 22 WHERE nombre_categoria = 'Libros / Cursos' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🎮', orden = 23 WHERE nombre_categoria = 'Hobbies' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '💳', orden = 24 WHERE nombre_categoria = 'Tarjetas de crédito' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🏦', orden = 25 WHERE nombre_categoria = 'Préstamos' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🛡️', orden = 26 WHERE nombre_categoria = 'Seguros' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '📋', orden = 27 WHERE nombre_categoria = 'Impuestos' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🎁', orden = 28 WHERE nombre_categoria = 'Regalos' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🍻', orden = 29 WHERE nombre_categoria = 'Salidas con amigos' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '👨‍👩‍👧', orden = 30 WHERE nombre_categoria = 'Familia' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🐾', orden = 31 WHERE nombre_categoria = 'Veterinario' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🐕', orden = 32 WHERE nombre_categoria = 'Comida mascotas' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '💰', orden = 33 WHERE nombre_categoria = 'Ahorro / Inversión' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '🚨', orden = 34 WHERE nombre_categoria = 'Emergencias' AND es_sistema = true;
UPDATE finanzas.categorias_gasto SET icono = '📦', orden = 35 WHERE nombre_categoria = 'Otros' AND es_sistema = true;

-- ============================================
-- 2. ADD NEW COLUMNS TO fuentes_ingreso
-- ============================================
ALTER TABLE finanzas.fuentes_ingreso
ADD COLUMN IF NOT EXISTS icono VARCHAR(10) DEFAULT '💰',
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES finanzas.usuarios(id),
ADD COLUMN IF NOT EXISTS es_sistema BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS orden INTEGER;

-- Mark all existing sources as system sources
UPDATE finanzas.fuentes_ingreso
SET es_sistema = true, activo = true
WHERE usuario_id IS NULL;

-- Drop old unique constraint if exists
ALTER TABLE finanzas.fuentes_ingreso DROP CONSTRAINT IF EXISTS fuentes_ingreso_nombre_key;

-- Create new composite unique index (name + user)
DROP INDEX IF EXISTS finanzas.fuentes_nombre_usuario_unique;
CREATE UNIQUE INDEX fuentes_nombre_usuario_unique
ON finanzas.fuentes_ingreso (nombre, COALESCE(usuario_id, -1));

-- Add default icons to existing system sources
UPDATE finanzas.fuentes_ingreso SET icono = '💼', orden = 1 WHERE nombre = 'Salario' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '💻', orden = 2 WHERE nombre = 'Freelance' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '🏠', orden = 3 WHERE nombre = 'Alquiler' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '📈', orden = 4 WHERE nombre = 'Inversiones' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '🛍️', orden = 5 WHERE nombre = 'Venta' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '🎁', orden = 6 WHERE nombre = 'Regalo' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '↩️', orden = 7 WHERE nombre = 'Reembolso' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '🎉', orden = 8 WHERE nombre = 'Bono' AND es_sistema = true;
UPDATE finanzas.fuentes_ingreso SET icono = '💰', orden = 9 WHERE nombre = 'Otro' AND es_sistema = true;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON finanzas.categorias_gasto(usuario_id);
CREATE INDEX IF NOT EXISTS idx_categorias_sistema ON finanzas.categorias_gasto(es_sistema);
CREATE INDEX IF NOT EXISTS idx_fuentes_usuario ON finanzas.fuentes_ingreso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fuentes_sistema ON finanzas.fuentes_ingreso(es_sistema);
