-- Migration: Create cuentas_bancarias table
-- Allows users to manage their bank accounts

CREATE TABLE IF NOT EXISTS finanzas.cuentas_bancarias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  banco VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ahorro', 'corriente')),
  ultimos_4_digitos VARCHAR(4),
  moneda VARCHAR(3) NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD')),
  activa BOOLEAN NOT NULL DEFAULT true,
  usuario_id INTEGER NOT NULL REFERENCES finanzas.usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_usuario_id ON finanzas.cuentas_bancarias(usuario_id);

-- Comments
COMMENT ON TABLE finanzas.cuentas_bancarias IS 'Bank accounts belonging to users';
COMMENT ON COLUMN finanzas.cuentas_bancarias.nombre IS 'Descriptive name (e.g., "Cuenta Sueldo Galicia")';
COMMENT ON COLUMN finanzas.cuentas_bancarias.tipo IS 'Account type: ahorro (savings) or corriente (checking)';
COMMENT ON COLUMN finanzas.cuentas_bancarias.ultimos_4_digitos IS 'Last 4 digits of CBU/account number for identification';
