import { Router } from 'express';
import {
  renderListaCompras,
  renderFormNuevaCompra,
  renderDetalleCompra,
  renderFormEditarCompra,
  handleFormNuevaCompra,
  handleFormEditarCompra,
  handleDeleteCompra
} from '../../controllers/views/compra.views.controller.js';

const router = Router();

// Lista de compras
router.get('/', renderListaCompras);

// Nueva compra
router.get('/nueva', renderFormNuevaCompra);
router.post('/nueva', handleFormNuevaCompra);

// Ver detalle de compra
router.get('/:id', renderDetalleCompra);

// Editar compra
router.get('/editar/:id', renderFormEditarCompra);
router.put('/:id', handleFormEditarCompra);

// Eliminar compra
router.delete('/:id', handleDeleteCompra);

export default router; 