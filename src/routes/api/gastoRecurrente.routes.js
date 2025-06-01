import { Router } from 'express';
import { validateCreateGastoRecurrente, validateUpdateGastoRecurrente } from '../../middlewares/validateGastRecurrenteMiddleware.js';
import {
  obtenerGastosRecurrentes,
  obtenerGastoRecurrentePorId,
  crearGastoRecurrente,
  actualizarGastoRecurrente,
  eliminarGastoRecurrente
} from '../../controllers/api/gastoRecurrente.controller.js';

const router = Router();

// Obtener todos los gastos recurrentes
router.get('/', obtenerGastosRecurrentes);

// Obtener un gasto recurrente por ID
router.get('/:id', obtenerGastoRecurrentePorId);

// Crear un nuevo gasto recurrente
router.post('/', validateCreateGastoRecurrente, crearGastoRecurrente);

// Actualizar un gasto recurrente
router.put('/:id', validateUpdateGastoRecurrente, actualizarGastoRecurrente);

// Eliminar un gasto recurrente
router.delete('/:id', eliminarGastoRecurrente);

export default router;
