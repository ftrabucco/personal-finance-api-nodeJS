import express from 'express';
import { DebitoAutomaticoController } from '../controllers/debitoAutomatico.controller.js';
import { validateCreateDebitoAutomatico, validateUpdateDebitoAutomatico } from '../middlewares/validateDebitoAutomaticoMiddleware.js';

const router = express.Router();

router.get('/', DebitoAutomaticoController.getAll);
router.get('/:id', DebitoAutomaticoController.getById);
router.post('/', validateCreateDebitoAutomatico, DebitoAutomaticoController.create);
router.put('/:id', validateUpdateDebitoAutomatico, DebitoAutomaticoController.update);
router.delete('/:id', DebitoAutomaticoController.delete);

export default router;
