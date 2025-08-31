-- Script de inicialización para PostgreSQL
-- Este archivo se ejecuta automáticamente al crear el contenedor

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS finanzas;

-- Usar el esquema
SET search_path TO finanzas;

-- Crear tablas de configuración
CREATE TABLE IF NOT EXISTS categorias_gasto (
    id SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS importancias_gasto (
    id SERIAL PRIMARY KEY,
    nombre_importancia VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS frecuencias_gasto (
    id SERIAL PRIMARY KEY,
    nombre_frecuencia VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    permite_cuotas BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tarjetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('debito', 'credito')),
    banco VARCHAR(255) NOT NULL,
    dia_mes_cierre INTEGER CHECK (dia_mes_cierre >= 1 AND dia_mes_cierre <= 31),
    dia_mes_vencimiento INTEGER CHECK (dia_mes_vencimiento >= 1 AND dia_mes_vencimiento <= 31),
    permite_cuotas BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tablas principales
CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    monto_ars DECIMAL(15,2),
    monto_usd DECIMAL(15,2),
    descripcion TEXT,
    categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id) ON DELETE RESTRICT,
    importancia_gasto_id INTEGER NOT NULL REFERENCES importancias_gasto(id) ON DELETE RESTRICT,
    frecuencia_gasto_id INTEGER REFERENCES frecuencias_gasto(id) ON DELETE SET NULL,
    cantidad_cuotas_totales INTEGER,
    cantidad_cuotas_pagadas INTEGER,
    tipo_pago_id INTEGER REFERENCES tipos_pago(id) ON DELETE SET NULL,
    tarjeta_id INTEGER REFERENCES tarjetas(id) ON DELETE SET NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_origen VARCHAR(50) NOT NULL,
    id_origen INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto_total DECIMAL(15,2) NOT NULL,
    cantidad_cuotas INTEGER NOT NULL,
    fecha_compra DATE NOT NULL,
    categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id) ON DELETE RESTRICT,
    importancia_gasto_id INTEGER NOT NULL REFERENCES importancias_gasto(id) ON DELETE RESTRICT,
    tipo_pago_id INTEGER NOT NULL REFERENCES tipos_pago(id) ON DELETE RESTRICT,
    tarjeta_id INTEGER REFERENCES tarjetas(id) ON DELETE SET NULL,
    pendiente_cuotas BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debitos_automaticos (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    dia_de_pago INTEGER NOT NULL CHECK (dia_de_pago >= 1 AND dia_de_pago <= 31),
    categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id) ON DELETE RESTRICT,
    importancia_gasto_id INTEGER NOT NULL REFERENCES importancias_gasto(id) ON DELETE RESTRICT,
    frecuencia_gasto_id INTEGER NOT NULL REFERENCES frecuencias_gasto(id) ON DELETE RESTRICT,
    tipo_pago_id INTEGER NOT NULL REFERENCES tipos_pago(id) ON DELETE RESTRICT,
    tarjeta_id INTEGER REFERENCES tarjetas(id) ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gastos_recurrentes (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    dia_de_pago INTEGER NOT NULL CHECK (dia_de_pago >= 1 AND dia_de_pago <= 31),
    frecuencia_gasto_id INTEGER NOT NULL REFERENCES frecuencias_gasto(id) ON DELETE RESTRICT,
    categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id) ON DELETE RESTRICT,
    importancia_gasto_id INTEGER NOT NULL REFERENCES importancias_gasto(id) ON DELETE RESTRICT,
    tipo_pago_id INTEGER NOT NULL REFERENCES tipos_pago(id) ON DELETE RESTRICT,
    tarjeta_id INTEGER REFERENCES tarjetas(id) ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_fecha_generado DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gastos_unico (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    fecha DATE NOT NULL,
    categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id) ON DELETE RESTRICT,
    importancia_gasto_id INTEGER NOT NULL REFERENCES importancias_gasto(id) ON DELETE RESTRICT,
    tipo_pago_id INTEGER NOT NULL REFERENCES tipos_pago(id) ON DELETE RESTRICT,
    tarjeta_id INTEGER REFERENCES tarjetas(id) ON DELETE SET NULL,
    procesado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria_gasto_id);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario ON gastos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha_compra);
CREATE INDEX IF NOT EXISTS idx_debitos_automaticos_dia ON debitos_automaticos(dia_de_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_dia ON gastos_recurrentes(dia_de_pago);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para updated_at
CREATE TRIGGER update_categorias_gasto_updated_at BEFORE UPDATE ON categorias_gasto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_importancias_gasto_updated_at BEFORE UPDATE ON importancias_gasto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_frecuencias_gasto_updated_at BEFORE UPDATE ON frecuencias_gasto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tipos_pago_updated_at BEFORE UPDATE ON tipos_pago FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tarjetas_updated_at BEFORE UPDATE ON tarjetas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gastos_updated_at BEFORE UPDATE ON gastos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debitos_automaticos_updated_at BEFORE UPDATE ON debitos_automaticos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gastos_recurrentes_updated_at BEFORE UPDATE ON gastos_recurrentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gastos_unico_updated_at BEFORE UPDATE ON gastos_unico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
