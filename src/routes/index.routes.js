// routes/index.js
import gastoRecurrenteRoutes from './gastoRecurrente.routes.js';
import debitoAutomaticoRoutes from './debitoAutomatico.routes.js';
import gastoUnicoRoutes from './gastoUnico.routes.js';
import { Router } from 'express';

const router = Router();

// Las rutas de compras están ahora en /api/compras (definidas en api/index.routes.js)
router.use('/gastos-recurrentes', gastoRecurrenteRoutes);
router.use('/debitos-automaticos', debitoAutomaticoRoutes);
router.use('/gastos-unicos', gastoUnicoRoutes);

export default router;
