import express from 'express';
import { GastoRecurrenteController } from '../controllers/gastoRecurrente.controller.js';
import { validateCreateGastoRecurrente, validateUpdateGastoRecurrente } from '../middlewares/validateGastRecurrenteMiddleware.js';

const router = express.Router();

router.get('/', GastoRecurrenteController.getAll);
router.get('/:id', GastoRecurrenteController.getById);
router.post('/', validateCreateGastoRecurrente, GastoRecurrenteController.create);
router.put('/:id', validateUpdateGastoRecurrente, GastoRecurrenteController.update);
router.delete('/:id', GastoRecurrenteController.delete);

export default router;
