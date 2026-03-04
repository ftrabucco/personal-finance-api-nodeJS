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
  eliminarGastoRecurrente,
  procesarGastoRecurrenteMesActual
} from '../../controllers/api/gastoRecurrente.controller.js';

import {
  obtenerDebitoAutomaticoPorId,
  obtenerDebitosAutomaticosConFiltros,
  crearDebitoAutomatico,
  actualizarDebitoAutomatico,
  eliminarDebitoAutomatico,
  procesarDebitoAutomaticoMesActual
} from '../../controllers/api/debitoAutomatico.controller.js';

import {
  obtenerGastoUnicoPorId,
  obtenerGastosUnicosConFiltros,
  crearGastoUnico,
  actualizarGastoUnico,
  eliminarGastoUnico
} from '../../controllers/api/gastoUnico.controller.js';

import {
  obtenerIngresoUnicoPorId,
  obtenerIngresosUnicosConFiltros,
  crearIngresoUnico,
  actualizarIngresoUnico,
  eliminarIngresoUnico
} from '../../controllers/api/ingresoUnico.controller.js';

import {
  obtenerIngresoRecurrentePorId,
  obtenerIngresosRecurrentesConFiltros,
  crearIngresoRecurrente,
  actualizarIngresoRecurrente,
  eliminarIngresoRecurrente,
  toggleActivoIngresoRecurrente
} from '../../controllers/api/ingresoRecurrente.controller.js';

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
  obtenerTipoCambioActual,
  obtenerHistoricoTipoCambio,
  configurarTipoCambioManual,
  actualizarTipoCambioDesdeAPI,
  convertirMonto
} from '../../controllers/api/tipoCambio.controller.js';

import {
  obtenerCategorias,
  obtenerImportancias,
  obtenerTiposPago,
  obtenerFrecuencias,
  obtenerFuentesIngreso,
  obtenerTodosCatalogos
} from '../../controllers/api/catalogo.controller.js';

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
  validateTarjetaFilters,
  validateProyeccionFilters,
  validateSaludFinancieraFilters,
  validateCreateIngresoUnico,
  validateUpdateIngresoUnico,
  validateIngresoUnicoFilters,
  validateCreateIngresoRecurrente,
  validateUpdateIngresoRecurrente,
  validateIngresoRecurrenteFilters
} from '../../middlewares/validation.middleware.js';

import { obtenerProyeccion } from '../../controllers/api/proyeccion.controller.js';
import { obtenerSaludFinanciera } from '../../controllers/api/saludFinanciera.controller.js';

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
router.post('/gastos-recurrentes/:id/procesar', authenticateToken, validateIdParam, procesarGastoRecurrenteMesActual); // Procesar para mes actual
router.put('/gastos-recurrentes/:id', authenticateToken, validateIdParam, validateUpdateGastoRecurrente, actualizarGastoRecurrente);
router.delete('/gastos-recurrentes/:id', authenticateToken, validateIdParam, eliminarGastoRecurrente);

// 🔐 Rutas para Débitos Automáticos - Requieren autenticación
router.get('/debitos-automaticos', authenticateToken, validateDebitoAutomaticoFilters, obtenerDebitosAutomaticosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/debitos-automaticos/:id', authenticateToken, validateIdParam, obtenerDebitoAutomaticoPorId);
router.post('/debitos-automaticos', authenticateToken, validateCreateDebitoAutomatico, crearDebitoAutomatico);
router.post('/debitos-automaticos/:id/procesar', authenticateToken, validateIdParam, procesarDebitoAutomaticoMesActual); // Procesar para mes actual
router.put('/debitos-automaticos/:id', authenticateToken, validateIdParam, validateUpdateDebitoAutomatico, actualizarDebitoAutomatico);
router.delete('/debitos-automaticos/:id', authenticateToken, validateIdParam, eliminarDebitoAutomatico);

// 🔐 Rutas para Gastos Únicos - Requieren autenticación
router.get('/gastos-unicos', authenticateToken, validateGastoUnicoFilters, obtenerGastosUnicosConFiltros); // Con filtros opcionales y paginación inteligente
router.get('/gastos-unicos/:id', authenticateToken, validateIdParam, obtenerGastoUnicoPorId);
router.post('/gastos-unicos', authenticateToken, validateCreateGastoUnico, crearGastoUnico);
router.put('/gastos-unicos/:id', authenticateToken, validateIdParam, validateUpdateGastoUnico, actualizarGastoUnico);
router.delete('/gastos-unicos/:id', authenticateToken, validateIdParam, eliminarGastoUnico);

// 💰 Rutas para Ingresos Únicos - Requieren autenticación
router.get('/ingresos-unicos', authenticateToken, validateIngresoUnicoFilters, obtenerIngresosUnicosConFiltros);
router.get('/ingresos-unicos/:id', authenticateToken, validateIdParam, obtenerIngresoUnicoPorId);
router.post('/ingresos-unicos', authenticateToken, validateCreateIngresoUnico, crearIngresoUnico);
router.put('/ingresos-unicos/:id', authenticateToken, validateIdParam, validateUpdateIngresoUnico, actualizarIngresoUnico);
router.delete('/ingresos-unicos/:id', authenticateToken, validateIdParam, eliminarIngresoUnico);

// 💰 Rutas para Ingresos Recurrentes - Requieren autenticación
router.get('/ingresos-recurrentes', authenticateToken, validateIngresoRecurrenteFilters, obtenerIngresosRecurrentesConFiltros);
router.get('/ingresos-recurrentes/:id', authenticateToken, validateIdParam, obtenerIngresoRecurrentePorId);
router.post('/ingresos-recurrentes', authenticateToken, validateCreateIngresoRecurrente, crearIngresoRecurrente);
router.put('/ingresos-recurrentes/:id', authenticateToken, validateIdParam, validateUpdateIngresoRecurrente, actualizarIngresoRecurrente);
router.patch('/ingresos-recurrentes/:id/toggle-activo', authenticateToken, validateIdParam, toggleActivoIngresoRecurrente);
router.delete('/ingresos-recurrentes/:id', authenticateToken, validateIdParam, eliminarIngresoRecurrente);

// 🔐 Rutas para Tarjetas - Requieren autenticación
router.get('/tarjetas', authenticateToken, validateTarjetaFilters, obtenerTarjetas); // Con filtros opcionales y paginación
router.get('/tarjetas/stats', authenticateToken, obtenerEstadisticasTarjetas); // Estadísticas del usuario
router.get('/tarjetas/:id', authenticateToken, validateIdParam, obtenerTarjetaPorId);
router.get('/tarjetas/:id/usage', authenticateToken, validateIdParam, validarUsoTarjeta); // Validar uso en gastos/compras
router.post('/tarjetas', authenticateToken, validateCreateTarjeta, crearTarjeta);
router.put('/tarjetas/:id', authenticateToken, validateIdParam, validateUpdateTarjeta, actualizarTarjeta);
router.delete('/tarjetas/:id', authenticateToken, validateIdParam, eliminarTarjeta);

// 💱 Rutas para Tipo de Cambio - Requieren autenticación
router.get('/tipo-cambio/actual', authenticateToken, obtenerTipoCambioActual); // Obtener TC actual
router.get('/tipo-cambio/historico', authenticateToken, obtenerHistoricoTipoCambio); // Obtener historial con filtros
router.post('/tipo-cambio/manual', authenticateToken, configurarTipoCambioManual); // Configurar TC manualmente
router.post('/tipo-cambio/actualizar', authenticateToken, actualizarTipoCambioDesdeAPI); // Actualizar desde API externa
router.post('/tipo-cambio/convertir', authenticateToken, convertirMonto); // Convertir monto entre monedas

// 📚 Rutas para Catálogos - Requieren autenticación
router.get('/catalogos', authenticateToken, obtenerTodosCatalogos); // Todos los catálogos en una sola llamada
router.get('/catalogos/categorias', authenticateToken, obtenerCategorias);
router.get('/catalogos/importancias', authenticateToken, obtenerImportancias);
router.get('/catalogos/tipos-pago', authenticateToken, obtenerTiposPago);
router.get('/catalogos/frecuencias', authenticateToken, obtenerFrecuencias);
router.get('/catalogos/fuentes-ingreso', authenticateToken, obtenerFuentesIngreso);

// 📊 Rutas para Proyección de Gastos - Requieren autenticación
router.get('/proyeccion', authenticateToken, validateProyeccionFilters, obtenerProyeccion);

// 💚 Rutas para Salud Financiera - Requieren autenticación
router.get('/salud-financiera', authenticateToken, validateSaludFinancieraFilters, obtenerSaludFinanciera);

export default router;
