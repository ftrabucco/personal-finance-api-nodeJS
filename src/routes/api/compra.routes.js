import { Router } from 'express';
import { validateCreateCompra, validateUpdateCompra } from '../../middlewares/validateCompraMiddleware.js';
import {
  crearCompra,
  obtenerCompras,
  obtenerCompraPorId,
  actualizarCompra,
  eliminarCompra
} from '../../controllers/api/compras.controller.js';
const router = Router();



router.get('/', obtenerCompras);
router.get('/:id', obtenerCompraPorId);
router.post('/', validateCreateCompra, crearCompra);
router.put('/:id', validateUpdateCompra, actualizarCompra);
router.delete('/:id', eliminarCompra);

export default router;
