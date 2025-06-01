import { Router } from 'express';
import { generateGastos, getGastos } from '../../controllers/api/gasto.controller.js';

const router = Router();

// Ruta para generar gastos manualmente
router.post('/generate', generateGastos);

// Ruta para obtener gastos con filtros
router.get('/', getGastos);

export default router; 