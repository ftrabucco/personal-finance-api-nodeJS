import { Router } from 'express';
const router = Router();
import {
    crearGasto,
    obtenerTodosGastos,
    obtenerGastos,
    obtenerGastoPorId,
    eliminarGasto,
    actualizarGasto
} from '../controllers/gastos.controller.js';
import { validateCreateGastoMiddleware, validateGetGastosMiddleware, validateParamGastoIdMiddleware, validatePutGastoMiddleware } from '../middlewares/validateGastoMiddleware.js';

router.post('/gasto', validateCreateGastoMiddleware, crearGasto);
router.put('/gasto/:id', validateParamGastoIdMiddleware, validatePutGastoMiddleware, actualizarGasto);
router.get('/gastos', validateGetGastosMiddleware, obtenerGastos);
router.get('/gastos/all', obtenerTodosGastos);
router.get('/gasto/:id', validateParamGastoIdMiddleware, obtenerGastoPorId);
router.delete('/gasto/:id', validateParamGastoIdMiddleware, eliminarGasto);


export default router;
