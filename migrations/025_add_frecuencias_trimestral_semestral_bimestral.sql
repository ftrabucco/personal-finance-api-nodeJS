-- Agrega frecuencias trimestral, semestral y bimestral a la tabla de frecuencias
-- Solo inserta si no existen para que sea idempotente

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia)
SELECT 'Trimestral'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE LOWER(nombre_frecuencia) = 'trimestral'
);

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia)
SELECT 'Semestral'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE LOWER(nombre_frecuencia) = 'semestral'
);

INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia)
SELECT 'Bimestral'
WHERE NOT EXISTS (
  SELECT 1 FROM finanzas.frecuencias_gasto WHERE LOWER(nombre_frecuencia) = 'bimestral'
);
