import { Router } from 'express';
import { validateCreateDebitoAutomatico, validateUpdateDebitoAutomatico } from '../../middlewares/validateDebitoAutomaticoMiddleware.js';
import {
  obtenerDebitosAutomaticos,
  obtenerDebitoAutomaticoPorId,
  crearDebitoAutomatico,
  actualizarDebitoAutomatico,
  eliminarDebitoAutomatico
} from '../../controllers/api/debitoAutomatico.controller.js';

const router = Router();

// Obtener todos los débitos automáticos
router.get('/', obtenerDebitosAutomaticos);

// Obtener un débito automático por ID
router.get('/:id', obtenerDebitoAutomaticoPorId);

// Crear un nuevo débito automático
router.post('/', validateCreateDebitoAutomatico, crearDebitoAutomatico);

// Actualizar un débito automático
router.put('/:id', validateUpdateDebitoAutomatico, actualizarDebitoAutomatico);

// Eliminar un débito automático
router.delete('/:id', eliminarDebitoAutomatico);

export default router;
