import { Router } from 'express';
import {
  renderListaDebitosAutomaticos,
  renderFormNuevoDebitoAutomatico,
  renderDetalleDebitoAutomatico,
  renderFormEditarDebitoAutomatico,
  handleFormNuevoDebitoAutomatico,
  handleFormEditarDebitoAutomatico,
  handleDeleteDebitoAutomatico
} from '../../controllers/views/debitoAutomatico.views.controller.js';

const router = Router();

// Lista de débitos automáticos
router.get('/', renderListaDebitosAutomaticos);

// Nuevo débito automático
router.get('/nuevo', renderFormNuevoDebitoAutomatico);
router.post('/nuevo', handleFormNuevoDebitoAutomatico);

// Ver detalle de débito automático
router.get('/:id', renderDetalleDebitoAutomatico);

// Editar débito automático
router.get('/editar/:id', renderFormEditarDebitoAutomatico);
router.put('/:id', handleFormEditarDebitoAutomatico);

// Eliminar débito automático
router.delete('/:id', handleDeleteDebitoAutomatico);

export default router;
