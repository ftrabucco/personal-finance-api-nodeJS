import { Router } from 'express';
import {
  obtenerGastoPorId,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  obtenerGastosConFiltros,
  obtenerResumenGastos,
  generarGastosPendientes
} from '../../controllers/api/gasto.controller.js';

import {
  obtenerCompraPorId,
  obtenerComprasConFiltros,
  crearCompra,
  actualizarCompra,
  eliminarCompra
} from '../../controllers/api/compra.controller.js';

import {
  obtenerGastoRecurrentePorId,
  obtenerGastosRecurrentesConFiltros,
  crearGastoRecurrente,
  actualizarGastoRecurrente,
  eliminarGastoRecurrente
} from '../../controllers/api/gastoRecurrente.controller.js';

import {
  obtenerDebitoAutomaticoPorId,
  obtenerDebitosAutomaticosConFiltros,
  crearDebitoAutomatico,
  actualizarDebitoAutomatico,
  eliminarDebitoAutomatico
} from '../../controllers/api/debitoAutomatico.controller.js';

import {
  obtenerGastoUnicoPorId,
  obtenerGastosUnicosConFiltros,
  crearGastoUnico,
  actualizarGastoUnico,
  eliminarGastoUnico
} from '../../controllers/api/gastoUnico.controller.js';

import {
  validateGastoFilters,
  validateIdParam,
  validateCreateGasto,
  validateUpdateGasto,
  validateCreateCompra,
  validateUpdateCompra,
  validateCreateGastoRecurrente,
  validateUpdateGastoRecurrente,
  validateCreateDebitoAutomatico,
  validateUpdateDebitoAutomatico,
  validateCreateGastoUnico,
  validateUpdateGastoUnico,
  validateGastoUnicoFilters,
  validateCompraFilters,
  validateGastoRecurrenteFilters,
  validateDebitoAutomaticoFilters
} from '../../middlewares/validation.middleware.js';

const router = Router();

// Rutas para Gastos (reales)
router.get('/gastos', validateGastoFilters, obtenerGastosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos/summary', obtenerResumenGastos);
router.get('/gastos/generate', generarGastosPendientes);
router.get('/gastos/:id', validateIdParam, obtenerGastoPorId);
router.post('/gastos', validateCreateGasto, crearGasto); // Create new gasto
router.put('/gastos/:id', [validateIdParam, validateUpdateGasto], actualizarGasto);
router.delete('/gastos/:id', validateIdParam, eliminarGasto);

// Rutas para Compras
router.get('/compras', validateCompraFilters, obtenerComprasConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/compras/:id', validateIdParam, obtenerCompraPorId);
router.post('/compras', validateCreateCompra, crearCompra);
router.put('/compras/:id', [validateIdParam, validateUpdateCompra], actualizarCompra);
router.delete('/compras/:id', validateIdParam, eliminarCompra);

// Rutas para Gastos Recurrentes
router.get('/gastos-recurrentes', validateGastoRecurrenteFilters, obtenerGastosRecurrentesConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos-recurrentes/:id', validateIdParam, obtenerGastoRecurrentePorId);
router.post('/gastos-recurrentes', validateCreateGastoRecurrente, crearGastoRecurrente);
router.put('/gastos-recurrentes/:id', [validateIdParam, validateUpdateGastoRecurrente], actualizarGastoRecurrente);
router.delete('/gastos-recurrentes/:id', validateIdParam, eliminarGastoRecurrente);

// Rutas para Débitos Automáticos
router.get('/debitos-automaticos', validateDebitoAutomaticoFilters, obtenerDebitosAutomaticosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/debitos-automaticos/:id', validateIdParam, obtenerDebitoAutomaticoPorId);
router.post('/debitos-automaticos', validateCreateDebitoAutomatico, crearDebitoAutomatico);
router.put('/debitos-automaticos/:id', [validateIdParam, validateUpdateDebitoAutomatico], actualizarDebitoAutomatico);
router.delete('/debitos-automaticos/:id', validateIdParam, eliminarDebitoAutomatico);

// Rutas para Gastos Únicos
router.get('/gastos-unicos', validateGastoUnicoFilters, obtenerGastosUnicosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos-unicos/:id', validateIdParam, obtenerGastoUnicoPorId);
router.post('/gastos-unicos', validateCreateGastoUnico, crearGastoUnico);
router.put('/gastos-unicos/:id', [validateIdParam, validateUpdateGastoUnico], actualizarGastoUnico);
router.delete('/gastos-unicos/:id', validateIdParam, eliminarGastoUnico);

export default router; 