import { Router } from 'express';
import compraViewRoutes from './compra.views.routes.js';
import debitoAutomaticoViewRoutes from './debitoAutomatico.views.routes.js';
import gastoRecurrenteViewRoutes from './gastoRecurrente.views.routes.js';
import gastoUnicoViewRoutes from './gastoUnico.views.routes.js';
// Import other view routes as they are created

const router = Router();

// View routes (HTML pages)
router.use('/compras', compraViewRoutes);
router.use('/debitos-automaticos', debitoAutomaticoViewRoutes);
router.use('/gastos-recurrentes', gastoRecurrenteViewRoutes);
router.use('/gastos-unicos', gastoUnicoViewRoutes);
// Add other view routes as they are created

export default router; 