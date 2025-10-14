import { Router } from 'express';
import authRoutes from './auth.routes.js';
import {
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
  obtenerTarjetas,
  obtenerTarjetaPorId,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  obtenerEstadisticasTarjetas,
  validarUsoTarjeta
} from '../../controllers/api/tarjeta.controller.js';

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
  validateDebitoAutomaticoFilters,
  validateCreateTarjeta,
  validateUpdateTarjeta,
  validateTarjetaFilters
} from '../../middlewares/validation.middleware.js';

import { authenticateToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// 🔐 Rutas de Autenticación
router.use('/auth', authRoutes);

// 🔐 Rutas para Gastos (reales) - Requieren autenticación
router.get('/gastos', authenticateToken, validateGastoFilters, obtenerGastosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos/summary', authenticateToken, obtenerResumenGastos);
router.get('/gastos/generate', authenticateToken, generarGastosPendientes);
router.post('/gastos/search', authenticateToken, buscarGastos); // Búsqueda avanzada
router.get('/gastos/:id', authenticateToken, validateIdParam, obtenerGastoPorId);
router.post('/gastos', authenticateToken, validateCreateGasto, crearGasto); // Create new gasto
router.put('/gastos/:id', authenticateToken, validateIdParam, validateUpdateGasto, actualizarGasto);
router.delete('/gastos/:id', authenticateToken, validateIdParam, eliminarGasto);

// 🔐 Rutas para Compras - Requieren autenticación
router.get('/compras', authenticateToken, validateCompraFilters, obtenerComprasConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/compras/:id', authenticateToken, validateIdParam, obtenerCompraPorId);
router.post('/compras', authenticateToken, validateCreateCompra, crearCompra);
router.put('/compras/:id', authenticateToken, validateIdParam, validateUpdateCompra, actualizarCompra);
router.delete('/compras/:id', authenticateToken, validateIdParam, eliminarCompra);

// 🔐 Rutas para Gastos Recurrentes - Requieren autenticación
router.get('/gastos-recurrentes', authenticateToken, validateGastoRecurrenteFilters, obtenerGastosRecurrentesConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos-recurrentes/:id', authenticateToken, validateIdParam, obtenerGastoRecurrentePorId);
router.post('/gastos-recurrentes', authenticateToken, validateCreateGastoRecurrente, crearGastoRecurrente);
router.put('/gastos-recurrentes/:id', authenticateToken, validateIdParam, validateUpdateGastoRecurrente, actualizarGastoRecurrente);
router.delete('/gastos-recurrentes/:id', authenticateToken, validateIdParam, eliminarGastoRecurrente);

// 🔐 Rutas para Débitos Automáticos - Requieren autenticación
router.get('/debitos-automaticos', authenticateToken, validateDebitoAutomaticoFilters, obtenerDebitosAutomaticosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/debitos-automaticos/:id', authenticateToken, validateIdParam, obtenerDebitoAutomaticoPorId);
router.post('/debitos-automaticos', authenticateToken, validateCreateDebitoAutomatico, crearDebitoAutomatico);
router.put('/debitos-automaticos/:id', authenticateToken, validateIdParam, validateUpdateDebitoAutomatico, actualizarDebitoAutomatico);
router.delete('/debitos-automaticos/:id', authenticateToken, validateIdParam, eliminarDebitoAutomatico);

// 🔐 Rutas para Gastos Únicos - Requieren autenticación
router.get('/gastos-unicos', authenticateToken, validateGastoUnicoFilters, obtenerGastosUnicosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos-unicos/:id', authenticateToken, validateIdParam, obtenerGastoUnicoPorId);
router.post('/gastos-unicos', authenticateToken, validateCreateGastoUnico, crearGastoUnico);
router.put('/gastos-unicos/:id', authenticateToken, validateIdParam, validateUpdateGastoUnico, actualizarGastoUnico);
router.delete('/gastos-unicos/:id', authenticateToken, validateIdParam, eliminarGastoUnico);

// 🔐 Rutas para Tarjetas - Requieren autenticación
router.get('/tarjetas', authenticateToken, validateTarjetaFilters, obtenerTarjetas); // Con filtros opcionales y paginación
router.get('/tarjetas/stats', authenticateToken, obtenerEstadisticasTarjetas); // Estadísticas del usuario
router.get('/tarjetas/:id', authenticateToken, validateIdParam, obtenerTarjetaPorId);
router.get('/tarjetas/:id/usage', authenticateToken, validateIdParam, validarUsoTarjeta); // Validar uso en gastos/compras
router.post('/tarjetas', authenticateToken, validateCreateTarjeta, crearTarjeta);
router.put('/tarjetas/:id', authenticateToken, validateIdParam, validateUpdateTarjeta, actualizarTarjeta);
router.delete('/tarjetas/:id', authenticateToken, validateIdParam, eliminarTarjeta);

export default router;
