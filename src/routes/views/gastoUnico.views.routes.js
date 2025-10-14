import { Router } from 'express';
import {
  renderListaGastosUnicos,
  renderFormNuevoGastoUnico,
  renderDetalleGastoUnico,
  renderFormEditarGastoUnico,
  handleFormNuevoGastoUnico,
  handleFormEditarGastoUnico,
  handleDeleteGastoUnico
} from '../../controllers/views/gastoUnico.views.controller.js';

const router = Router();

// Lista de gastos únicos
router.get('/', renderListaGastosUnicos);

// Nuevo gasto único
router.get('/nuevo', renderFormNuevoGastoUnico);
router.post('/nuevo', handleFormNuevoGastoUnico);

// Ver detalle de gasto único
router.get('/:id', renderDetalleGastoUnico);

// Editar gasto único
router.get('/editar/:id', renderFormEditarGastoUnico);
router.put('/:id', handleFormEditarGastoUnico);

// Eliminar gasto único
router.delete('/:id', handleDeleteGastoUnico);

export default router;
