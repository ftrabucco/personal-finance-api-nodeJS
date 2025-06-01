import { Router } from 'express';
import { validateCreateGastoUnico, validateUpdateGastoUnico } from '../../middlewares/validateGastoUnicoMiddleware.js';
import {
  obtenerGastosUnicos,
  obtenerGastoUnicoPorId,
  crearGastoUnico,
  actualizarGastoUnico,
  eliminarGastoUnico
} from '../../controllers/api/gastoUnico.controller.js';

const router = Router();

// Obtener todos los gastos únicos
router.get('/', obtenerGastosUnicos);

// Obtener un gasto único por ID
router.get('/:id', obtenerGastoUnicoPorId);

// Crear un nuevo gasto único
router.post('/', validateCreateGastoUnico, crearGastoUnico);

// Actualizar un gasto único
router.put('/:id', validateUpdateGastoUnico, actualizarGastoUnico);

// Eliminar un gasto único
router.delete('/:id', eliminarGastoUnico);

export default router;
