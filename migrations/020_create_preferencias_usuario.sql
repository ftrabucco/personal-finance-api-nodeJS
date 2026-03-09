-- Migration: Create preferencias_usuario table
-- Allows users to customize which modules they see in the app

CREATE TABLE IF NOT EXISTS finanzas.preferencias_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
  modulos_activos JSONB NOT NULL DEFAULT '["gastos_unicos", "ingresos_unicos"]',
  tema VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (tema IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_preferencias_usuario_id ON finanzas.preferencias_usuario(usuario_id);

-- Comment on table
COMMENT ON TABLE finanzas.preferencias_usuario IS 'User preferences for app customization including active modules';
COMMENT ON COLUMN finanzas.preferencias_usuario.modulos_activos IS 'Array of optional module keys that are enabled for the user';
COMMENT ON COLUMN finanzas.preferencias_usuario.tema IS 'UI theme preference: light, dark, or system';
