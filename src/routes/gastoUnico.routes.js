import express from 'express';
import { GastoUnicoController } from '../controllers/gastoUnico.controller.js';
import { validateCreateGastoUnico, validateUpdateGastoUnico } from '../middlewares/validateGastoUnicoMiddleware.js';

const router = express.Router();

router.get('/', GastoUnicoController.getAll);
router.get('/:id', GastoUnicoController.getById);
router.post('/', validateCreateGastoUnico, GastoUnicoController.create);
router.put('/:id', validateUpdateGastoUnico, GastoUnicoController.update);
router.delete('/:id', GastoUnicoController.delete);

export default router;
