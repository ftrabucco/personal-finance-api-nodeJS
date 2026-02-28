/**
 * 🏗️ Dependency Injection Container
 *
 * Centraliza la creación e inyección de dependencias usando Awilix.
 * Esto permite:
 * - Testear servicios fácilmente con mocks
 * - Desacoplar dependencias entre módulos
 * - Configuración centralizada de servicios
 */

import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import sequelize from '../db/postgres.js';
import logger from '../utils/logger.js';

// Models
import {
  Gasto,
  GastoUnico,
  GastoRecurrente,
  DebitoAutomatico,
  Compra,
  CategoriaGasto,
  ImportanciaGasto,
  TipoPago,
  Tarjeta,
  FrecuenciaGasto,
  TipoCambio,
  Usuario,
  IngresoUnico,
  IngresoRecurrente
} from '../models/index.js';

// Services
import { GastoUnicoService } from '../services/gastoUnico.service.js';
import { GastoRecurrenteService } from '../services/gastoRecurrente.service.js';
import { DebitoAutomaticoService } from '../services/debitoAutomatico.service.js';
import { ComprasService } from '../services/compras.service.js';
import { TarjetaService } from '../services/tarjeta.service.js';
import { GastoGeneratorService } from '../services/gastoGenerator.service.js';
import { ExchangeRateServiceInstance } from '../services/exchangeRate.service.js';
import { AuthService } from '../services/auth.service.js';
import { IngresoUnicoService } from '../services/ingresoUnico.service.js';
import { IngresoRecurrenteService } from '../services/ingresoRecurrente.service.js';

// Strategies
import { ImmediateExpenseStrategy } from '../strategies/expenseGeneration/immediateStrategy.js';
import { RecurringExpenseStrategy } from '../strategies/expenseGeneration/recurringStrategy.js';
import { AutomaticDebitExpenseStrategy } from '../strategies/expenseGeneration/automaticDebitStrategy.js';
import { InstallmentExpenseStrategy } from '../strategies/expenseGeneration/installmentStrategy.js';

// Utils
import { TransactionManager } from './transactionManager.js';

/**
 * Creates and configures the DI container
 */
export function createAppContainer() {
  const container = createContainer({
    injectionMode: InjectionMode.PROXY
  });

  container.register({
    // ============================================
    // Infrastructure
    // ============================================
    sequelize: asValue(sequelize),
    logger: asValue(logger),
    transactionManager: asClass(TransactionManager).singleton(),

    // ============================================
    // Models (as values - they're already singletons)
    // ============================================
    models: asValue({
      Gasto,
      GastoUnico,
      GastoRecurrente,
      DebitoAutomatico,
      Compra,
      CategoriaGasto,
      ImportanciaGasto,
      TipoPago,
      Tarjeta,
      FrecuenciaGasto,
      TipoCambio,
      Usuario,
      IngresoUnico,
      IngresoRecurrente
    }),

    // ============================================
    // Strategies (singleton - stateless)
    // ============================================
    immediateStrategy: asClass(ImmediateExpenseStrategy).singleton(),
    recurringStrategy: asClass(RecurringExpenseStrategy).singleton(),
    automaticDebitStrategy: asClass(AutomaticDebitExpenseStrategy).singleton(),
    installmentStrategy: asClass(InstallmentExpenseStrategy).singleton(),

    // ============================================
    // Services (scoped per request in web context)
    // ============================================
    gastoUnicoService: asClass(GastoUnicoService).scoped(),
    gastoRecurrenteService: asClass(GastoRecurrenteService).scoped(),
    debitoAutomaticoService: asClass(DebitoAutomaticoService).scoped(),
    comprasService: asClass(ComprasService).scoped(),
    tarjetaService: asClass(TarjetaService).scoped(),
    gastoGeneratorService: asClass(GastoGeneratorService).scoped(),
    exchangeRateService: asClass(ExchangeRateServiceInstance).scoped(),
    authService: asClass(AuthService).singleton(),
    ingresoUnicoService: asClass(IngresoUnicoService).scoped(),
    ingresoRecurrenteService: asClass(IngresoRecurrenteService).scoped()
  });

  return container;
}

// Global container instance
let container = null;

/**
 * Get the global container instance (creates it if not exists)
 */
export function getContainer() {
  if (!container) {
    container = createAppContainer();
  }
  return container;
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer() {
  if (container) {
    container.dispose();
  }
  container = null;
}

/**
 * Create a scoped container for a request
 */
export function createScope() {
  return getContainer().createScope();
}

export default { createAppContainer, getContainer, resetContainer, createScope };
