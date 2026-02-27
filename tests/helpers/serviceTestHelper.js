/**
 * 🧪 Service Test Helper
 *
 * Provides utilities for testing services with DI dependencies.
 * Creates properly configured mock dependencies for unit tests.
 */

/**
 * Creates mock dependencies for DI-enabled services
 * @param {Object} overrides - Custom mock implementations
 * @returns {Object} Mock dependencies object
 */
export function createMockDependencies(overrides = {}) {
  const defaultMocks = {
    models: {
      Gasto: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
      },
      GastoUnico: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        name: 'GastoUnico',
      },
      GastoRecurrente: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        name: 'GastoRecurrente',
      },
      DebitoAutomatico: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        name: 'DebitoAutomatico',
      },
      Compra: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        name: 'Compra',
      },
      CategoriaGasto: { findByPk: jest.fn() },
      ImportanciaGasto: { findByPk: jest.fn() },
      TipoPago: { findByPk: jest.fn() },
      Tarjeta: { findByPk: jest.fn() },
      Frecuencia: { findByPk: jest.fn() },
      TipoCambio: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      Usuario: { findByPk: jest.fn() },
      IngresoUnico: { create: jest.fn(), findAll: jest.fn() },
      IngresoRecurrente: { create: jest.fn(), findAll: jest.fn() },
    },

    transactionManager: {
      withTransaction: jest.fn(async (callback) => {
        const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        return callback(mockTransaction);
      }),
      withRetry: jest.fn(async (callback) => callback()),
    },

    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },

    immediateStrategy: {
      generate: jest.fn(),
    },

    recurringStrategy: {
      generate: jest.fn(),
      shouldGenerate: jest.fn(),
    },

    automaticDebitStrategy: {
      generate: jest.fn(),
      shouldGenerate: jest.fn(),
    },

    installmentStrategy: {
      generate: jest.fn(),
      shouldGenerate: jest.fn(),
    },

    exchangeRateService: {
      getCurrentRate: jest.fn(),
      getRateForDate: jest.fn(),
      calculateBothCurrencies: jest.fn().mockResolvedValue({
        monto_ars: 1000,
        monto_usd: 1,
        tipo_cambio_usado: 1000,
      }),
      convertARStoUSD: jest.fn(),
      convertUSDtoARS: jest.fn(),
    },

    sequelize: {
      transaction: jest.fn(),
    },
  };

  // Deep merge overrides with defaults
  return deepMerge(defaultMocks, overrides);
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Creates a mock request with container
 * @param {Object} overrides - Override request properties
 * @returns {Object} Mock Express request
 */
export function createMockRequest(overrides = {}) {
  const mockDeps = createMockDependencies();

  return {
    container: {
      resolve: jest.fn((name) => mockDeps[name]),
      cradle: mockDeps,
    },
    scope: {
      resolve: jest.fn((name) => mockDeps[name]),
      dispose: jest.fn(),
    },
    user: { id: 1 },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

/**
 * Creates a mock response
 * @returns {Object} Mock Express response
 */
export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
}
