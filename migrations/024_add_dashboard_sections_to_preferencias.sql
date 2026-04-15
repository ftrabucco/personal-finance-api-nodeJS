ALTER TABLE finanzas.preferencias_usuario
ADD COLUMN IF NOT EXISTS dashboard_sections JSONB NOT NULL DEFAULT '["balance_acumulado","tasa_ahorro","evolucion_tabla","ingresos_vs_gastos","gastos_categoria","desglose_mes","gastos_recientes","proyeccion"]'::jsonb;
