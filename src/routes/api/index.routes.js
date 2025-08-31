import { Router } from 'express';
import {
  obtenerTodosGastos,
  obtenerGastoPorId,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  obtenerGastosConFiltros,
  obtenerResumenGastos,
  generarGastosPendientes,
  buscarGastos
} from '../../controllers/api/gasto.controller.js';

import {
  obtenerCompras,
  obtenerCompraPorId,
  crearCompra,
  actualizarCompra,
  eliminarCompra
} from '../../controllers/api/compra.controller.js';

import {
  obtenerGastosRecurrentes,
  obtenerGastoRecurrentePorId,
  crearGastoRecurrente,
  actualizarGastoRecurrente,
  eliminarGastoRecurrente
} from '../../controllers/api/gastoRecurrente.controller.js';

import {
  obtenerDebitosAutomaticos,
  obtenerDebitoAutomaticoPorId,
  crearDebitoAutomatico,
  actualizarDebitoAutomatico,
  eliminarDebitoAutomatico
} from '../../controllers/api/debitoAutomatico.controller.js';

import {
  obtenerGastosUnicos,
  obtenerGastoUnicoPorId,
  crearGastoUnico,
  actualizarGastoUnico,
  eliminarGastoUnico
} from '../../controllers/api/gastoUnico.controller.js';

import {
  validateGastoFilters,
  validateIdParam,
  validateCreateCompra,
  validateUpdateCompra,
  validateCreateGastoRecurrente,
  validateUpdateGastoRecurrente,
  validateCreateDebitoAutomatico,
  validateUpdateDebitoAutomatico,
  validateCreateGastoUnico,
  validateUpdateGastoUnico
} from '../../middlewares/validation.middleware.js';

const router = Router();

// Rutas para Gastos (reales)
router.get('/gastos', validateGastoFilters, obtenerGastosConFiltros); // Con filtros opcionales
router.get('/gastos/summary', obtenerResumenGastos);
router.get('/gastos/generate', generarGastosPendientes);
router.get('/gastos/:id', validateIdParam, obtenerGastoPorId);
router.post('/gastos/search', buscarGastos); // Búsquedas compuestas
router.put('/gastos/:id', validateIdParam, actualizarGasto);
router.delete('/gastos/:id', validateIdParam, eliminarGasto);

// Rutas para Compras
router.get('/compras', obtenerCompras);
router.get('/compras/:id', validateIdParam, obtenerCompraPorId);
router.post('/compras', validateCreateCompra, crearCompra);
router.put('/compras/:id', [validateIdParam, validateUpdateCompra], actualizarCompra);
router.delete('/compras/:id', validateIdParam, eliminarCompra);

// Rutas para Gastos Recurrentes
router.get('/gastos-recurrentes', obtenerGastosRecurrentes);
router.get('/gastos-recurrentes/:id', validateIdParam, obtenerGastoRecurrentePorId);
router.post('/gastos-recurrentes', validateCreateGastoRecurrente, crearGastoRecurrente);
router.put('/gastos-recurrentes/:id', [validateIdParam, validateUpdateGastoRecurrente], actualizarGastoRecurrente);
router.delete('/gastos-recurrentes/:id', validateIdParam, eliminarGastoRecurrente);

// Rutas para Débitos Automáticos
router.get('/debitos-automaticos', obtenerDebitosAutomaticos);
router.get('/debitos-automaticos/:id', validateIdParam, obtenerDebitoAutomaticoPorId);
router.post('/debitos-automaticos', validateCreateDebitoAutomatico, crearDebitoAutomatico);
router.put('/debitos-automaticos/:id', [validateIdParam, validateUpdateDebitoAutomatico], actualizarDebitoAutomatico);
router.delete('/debitos-automaticos/:id', validateIdParam, eliminarDebitoAutomatico);

// Rutas para Gastos Únicos
router.get('/gastos-unicos', obtenerGastosUnicos);
router.get('/gastos-unicos/:id', validateIdParam, obtenerGastoUnicoPorId);
router.post('/gastos-unicos', validateCreateGastoUnico, crearGastoUnico);
router.put('/gastos-unicos/:id', [validateIdParam, validateUpdateGastoUnico], actualizarGastoUnico);
router.delete('/gastos-unicos/:id', validateIdParam, eliminarGastoUnico);

export default router; 