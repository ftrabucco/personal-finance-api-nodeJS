import express from 'express';
import { validateCreateCompra, validateUpdateCompra } from '../middlewares/validateCompraMiddleware.js';
import {
  crearCompra,
  obtenerCompras,
  obtenerCompraPorId,
  actualizarCompra,
  eliminarCompra
} from '../controllers/compras.controller.js';
import {
  renderListaCompras,
  renderFormNuevaCompra,
  handleFormNuevaCompra
} from '../controllers/compra.views.controller.js';

const router = express.Router();


router.get('/vista', renderListaCompras);
router.get('/vista/nueva', renderFormNuevaCompra);
router.post('/vista/nueva', handleFormNuevaCompra);

router.post('/', validateCreateCompra, crearCompra);
router.get('/', obtenerCompras);
router.get('/:id', obtenerCompraPorId);
router.put('/:id', validateUpdateCompra,actualizarCompra);
router.delete('/:id', eliminarCompra);

export default router;
