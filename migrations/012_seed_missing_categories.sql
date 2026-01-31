-- Migration: Seed missing categories
-- Purpose: Add all 35 categories that should exist (production only has 8)
-- Date: 2026-01-28
-- Run this manually on production database

-- Insert missing categories (ON CONFLICT DO NOTHING will skip existing ones)
INSERT INTO finanzas.categorias_gasto (nombre_categoria) VALUES
  -- 🏠 Vivienda
  ('Alquiler'),
  ('Expensas'),
  ('Servicios (luz, gas, agua)'),
  ('Internet / Cable'),
  ('Hogar / Mantenimiento'),
  -- 🛒 Alimentación
  ('Supermercado'),
  ('Almacén / Verdulería'),
  ('Delivery / Comida'),
  ('Restaurantes'),
  -- 🚗 Transporte
  ('Transporte público'),
  ('Combustible'),
  ('Uber / Taxi'),
  ('Mantenimiento vehículo'),
  -- 💊 Salud
  ('Farmacia'),
  ('Médicos / Consultas'),
  ('Obra social / Prepaga'),
  -- 🎯 Personal
  ('Peluquería / Estética'),
  ('Ropa / Calzado'),
  ('Gimnasio / Deportes'),
  -- 🎮 Entretenimiento
  ('Streaming / Suscripciones'),
  ('Cine / Teatro'),
  ('Libros / Cursos'),
  ('Hobbies'),
  -- 💳 Financiero
  ('Tarjetas de crédito'),
  ('Préstamos'),
  ('Seguros'),
  ('Impuestos'),
  -- 👥 Social
  ('Regalos'),
  ('Salidas con amigos'),
  ('Familia'),
  -- 🐕 Mascotas
  ('Veterinario'),
  ('Comida mascotas'),
  -- 💰 Otros
  ('Ahorro / Inversión'),
  ('Emergencias'),
  ('Otros')
ON CONFLICT (nombre_categoria) DO NOTHING;

-- Verify the categories were inserted
SELECT id, nombre_categoria FROM finanzas.categorias_gasto ORDER BY id;

-- Success message
SELECT 'Migration 012: Missing categories seeded' AS status;
