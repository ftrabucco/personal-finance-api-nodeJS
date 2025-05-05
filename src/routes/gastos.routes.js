import { Router } from 'express';
const router = Router();
import { crearGasto, obtenerTodosGastos,obtenerGastos } from '../controllers/gastos.controller.js';
import { validateGastoMiddleware } from '../middlewares/validateGastoMiddleware.js';

router.post('/gasto', validateGastoMiddleware, crearGasto);
router.get('/gastos', obtenerGastos);

router.get('/', obtenerTodosGastos);

export default router;
