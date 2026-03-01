-- Migration: Create user preferences tables for categories and income sources
-- Purpose: Allow users to hide/show system categories and income sources
-- Date: 2026-03-01

-- Create user_categoria_preferences table
CREATE TABLE IF NOT EXISTS finanzas.user_categoria_preferences (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
    categoria_gasto_id INTEGER NOT NULL REFERENCES finanzas.categorias_gasto(id) ON DELETE CASCADE,
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, categoria_gasto_id)
);

-- Create user_fuente_ingreso_preferences table
CREATE TABLE IF NOT EXISTS finanzas.user_fuente_ingreso_preferences (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
    fuente_ingreso_id INTEGER NOT NULL REFERENCES finanzas.fuentes_ingreso(id) ON DELETE CASCADE,
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, fuente_ingreso_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_categoria_pref_usuario ON finanzas.user_categoria_preferences(usuario_id);
CREATE INDEX IF NOT EXISTS idx_user_categoria_pref_categoria ON finanzas.user_categoria_preferences(categoria_gasto_id);
CREATE INDEX IF NOT EXISTS idx_user_fuente_pref_usuario ON finanzas.user_fuente_ingreso_preferences(usuario_id);
CREATE INDEX IF NOT EXISTS idx_user_fuente_pref_fuente ON finanzas.user_fuente_ingreso_preferences(fuente_ingreso_id);

-- Verify the tables were created
SELECT 'Migration 021: User preferences tables created' AS status;
