// routes/index.js
import compraRoutes from './compra.routes.js';
import gastoRecurrenteRoutes from './gastoRecurrente.routes.js';
import debitoAutomaticoRoutes from './debitoAutomatico.routes.js';
import gastoUnicoRoutes from './gastoUnico.routes.js';
import { Router } from 'express';

const router = Router();

router.use('/compras', compraRoutes);
router.use('/gastos-recurrentes', gastoRecurrenteRoutes);
router.use('/debitos-automaticos', debitoAutomaticoRoutes);
router.use('/gastos-unicos', gastoUnicoRoutes);

export default router;
