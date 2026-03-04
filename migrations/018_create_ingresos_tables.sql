-- Migration: Create income tables (fuentes_ingreso, ingresos_unico, ingresos_recurrentes)
-- Creates the ENUM type and tables for income tracking

-- Create moneda_tipo ENUM if not exists (may already exist from gastos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moneda_tipo') THEN
        CREATE TYPE moneda_tipo AS ENUM ('ARS', 'USD');
    END IF;
END$$;

-- Create fuentes_ingreso catalog table
CREATE TABLE IF NOT EXISTS finanzas.fuentes_ingreso (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- Seed initial fuentes_ingreso
INSERT INTO finanzas.fuentes_ingreso (nombre) VALUES
    ('Sueldo'),
    ('Freelance'),
    ('Inversiones'),
    ('Alquiler'),
    ('Otro')
ON CONFLICT (nombre) DO NOTHING;

-- Create ingresos_unico table
CREATE TABLE IF NOT EXISTS finanzas.ingresos_unico (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    fecha DATE NOT NULL,
    fuente_ingreso_id INTEGER NOT NULL REFERENCES finanzas.fuentes_ingreso(id),
    usuario_id INTEGER NOT NULL REFERENCES finanzas.usuarios(id),
    moneda_origen VARCHAR(3) NOT NULL DEFAULT 'ARS',
    monto_ars DECIMAL(10, 2),
    monto_usd DECIMAL(10, 2),
    tipo_cambio_usado DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ingresos_recurrentes table
CREATE TABLE IF NOT EXISTS finanzas.ingresos_recurrentes (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    dia_de_pago INTEGER NOT NULL CHECK (dia_de_pago >= 1 AND dia_de_pago <= 31),
    mes_de_pago INTEGER CHECK (mes_de_pago >= 1 AND mes_de_pago <= 12),
    frecuencia_gasto_id INTEGER NOT NULL REFERENCES finanzas.frecuencias_gasto(id),
    fuente_ingreso_id INTEGER NOT NULL REFERENCES finanzas.fuentes_ingreso(id),
    usuario_id INTEGER NOT NULL REFERENCES finanzas.usuarios(id),
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_inicio DATE,
    fecha_fin DATE,
    moneda_origen VARCHAR(3) NOT NULL DEFAULT 'ARS',
    monto_ars DECIMAL(10, 2),
    monto_usd DECIMAL(10, 2),
    tipo_cambio_referencia DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ingresos_unico_usuario ON finanzas.ingresos_unico(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_unico_fecha ON finanzas.ingresos_unico(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_unico_fuente ON finanzas.ingresos_unico(fuente_ingreso_id);

CREATE INDEX IF NOT EXISTS idx_ingresos_recurrentes_usuario ON finanzas.ingresos_recurrentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_recurrentes_activo ON finanzas.ingresos_recurrentes(activo);
CREATE INDEX IF NOT EXISTS idx_ingresos_recurrentes_fuente ON finanzas.ingresos_recurrentes(fuente_ingreso_id);
