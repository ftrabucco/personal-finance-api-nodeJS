import { Router } from 'express';
import compraViewRoutes from './compra.views.routes.js';
import debitoAutomaticoViewRoutes from './debitoAutomatico.views.routes.js';
import gastoRecurrenteViewRoutes from './gastoRecurrente.views.routes.js';
import gastoUnicoViewRoutes from './gastoUnico.views.routes.js';
import { renderDashboard } from '../../controllers/views/dashboard.views.controller.js';

const router = Router();

// View routes (HTML pages)
router.get('/', renderDashboard);
router.use('/compras', compraViewRoutes);
router.use('/debitos-automaticos', debitoAutomaticoViewRoutes);
router.use('/gastos-recurrentes', gastoRecurrenteViewRoutes);
router.use('/gastos-unicos', gastoUnicoViewRoutes);

export default router; 