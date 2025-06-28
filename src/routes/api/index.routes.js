import { Router } from 'express';
import {
  obtenerTodosGastos,
  obtenerGastoPorId,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  obtenerGastosConFiltros,
  obtenerResumenGastos,
  generarGastosPendientes
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
  validateCreateGastoRecurrente,
  validateCreateDebitoAutomatico,
  validateCreateGastoUnico
} from '../../middlewares/validateGasto.middleware.js';

const router = Router();

// Rutas para Gastos (reales)
router.get('/gastos', validateGastoFilters, obtenerGastosConFiltros);
router.get('/gastos/all', obtenerTodosGastos);
router.get('/gastos/summary', validateGastoFilters, obtenerResumenGastos);
router.get('/gastos/generate', generarGastosPendientes);
router.get('/gastos/:id', validateIdParam, obtenerGastoPorId);
router.post('/gastos', validateCreateGastoUnico, crearGasto);
router.put('/gastos/:id', [validateIdParam, validateCreateGastoUnico], actualizarGasto);
router.delete('/gastos/:id', validateIdParam, eliminarGasto);

// Rutas para Compras
router.get('/compras', obtenerCompras);
router.get('/compras/:id', validateIdParam, obtenerCompraPorId);
router.post('/compras', validateCreateCompra, crearCompra);
router.put('/compras/:id', [validateIdParam, validateCreateCompra], actualizarCompra);
router.delete('/compras/:id', validateIdParam, eliminarCompra);

// Rutas para Gastos Recurrentes
router.get('/gastos-recurrentes', obtenerGastosRecurrentes);
router.get('/gastos-recurrentes/:id', validateIdParam, obtenerGastoRecurrentePorId);
router.post('/gastos-recurrentes', validateCreateGastoRecurrente, crearGastoRecurrente);
router.put('/gastos-recurrentes/:id', [validateIdParam, validateCreateGastoRecurrente], actualizarGastoRecurrente);
router.delete('/gastos-recurrentes/:id', validateIdParam, eliminarGastoRecurrente);

// Rutas para Débitos Automáticos
router.get('/debitos-automaticos', obtenerDebitosAutomaticos);
router.get('/debitos-automaticos/:id', validateIdParam, obtenerDebitoAutomaticoPorId);
router.post('/debitos-automaticos', validateCreateDebitoAutomatico, crearDebitoAutomatico);
router.put('/debitos-automaticos/:id', [validateIdParam, validateCreateDebitoAutomatico], actualizarDebitoAutomatico);
router.delete('/debitos-automaticos/:id', validateIdParam, eliminarDebitoAutomatico);

// Rutas para Gastos Únicos
router.get('/gastos-unicos', obtenerGastosUnicos);
router.get('/gastos-unicos/:id', validateIdParam, obtenerGastoUnicoPorId);
router.post('/gastos-unicos', validateCreateGastoUnico, crearGastoUnico);
router.put('/gastos-unicos/:id', [validateIdParam, validateCreateGastoUnico], actualizarGastoUnico);
router.delete('/gastos-unicos/:id', validateIdParam, eliminarGastoUnico);

export default router; 