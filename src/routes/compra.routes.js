import express from 'express';
import {
  crearCompra,
  obtenerCompras,
  obtenerCompraPorId,
  actualizarCompra,
  eliminarCompra
} from '../controllers/compras.controller.js';
import { validateCreateCompra, validateUpdateCompra } from '../middlewares/validateCompraMiddleware.js';

const router = express.Router();

router.post('/', validateCreateCompra, crearCompra);
router.get('/', obtenerCompras);
router.get('/:id', obtenerCompraPorId);
router.put('/:id', validateUpdateCompra,actualizarCompra);
router.delete('/:id', eliminarCompra);

export default router;
