import { Router } from 'express';
import {
  renderListaGastosRecurrentes,
  renderFormNuevoGastoRecurrente,
  renderDetalleGastoRecurrente,
  renderFormEditarGastoRecurrente,
  handleFormNuevoGastoRecurrente,
  handleFormEditarGastoRecurrente,
  handleDeleteGastoRecurrente
} from '../../controllers/views/gastoRecurrente.views.controller.js';

const router = Router();

// Lista de gastos recurrentes
router.get('/', renderListaGastosRecurrentes);

// Nuevo gasto recurrente
router.get('/nuevo', renderFormNuevoGastoRecurrente);
router.post('/nuevo', handleFormNuevoGastoRecurrente);

// Ver detalle de gasto recurrente
router.get('/:id', renderDetalleGastoRecurrente);

// Editar gasto recurrente
router.get('/editar/:id', renderFormEditarGastoRecurrente);
router.put('/:id', handleFormEditarGastoRecurrente);

// Eliminar gasto recurrente
router.delete('/:id', handleDeleteGastoRecurrente);

export default router;
