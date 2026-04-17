-- Agrega frecuencias trimestral, semestral y bimestral a la tabla de frecuencias
-- Solo inserta si no existen para que sea idempotente

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia, descripcion)
SELECT 'trimestral', 'Cada 3 meses'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE nombre_frecuencia = 'trimestral'
);

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia, descripcion)
SELECT 'semestral', 'Cada 6 meses'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE nombre_frecuencia = 'semestral'
);

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia, descripcion)
SELECT 'bimestral', 'Cada 2 meses'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE nombre_frecuencia = 'bimestral'
);
