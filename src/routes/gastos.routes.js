import { Router } from 'express';
const router = Router();
import { crearGasto, obtenerGastos } from '../controllers/gastos.controller.js';
import { validateGastoMiddleware } from '../middlewares/validateGastoMiddleware.js';

router.post('/gasto', validateGastoMiddleware, crearGasto);
router.get('/', obtenerGastos);

export default router;
