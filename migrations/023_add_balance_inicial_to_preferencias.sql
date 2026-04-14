-- Agregar campo balance_inicial a preferencias_usuario
-- Permite al usuario definir su balance inicial antes de empezar a usar la app

ALTER TABLE finanzas.preferencias_usuario
ADD COLUMN IF NOT EXISTS balance_inicial DECIMAL(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN finanzas.preferencias_usuario.balance_inicial IS 'Balance inicial del usuario antes de empezar a usar la app (en ARS)';
