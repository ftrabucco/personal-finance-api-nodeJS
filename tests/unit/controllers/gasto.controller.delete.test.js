import { jest } from '@jest/globals';

/**
 * Unit tests for GastoController.delete
 *
 * Covers the fix for the orphaned-GastoUnico bug: deleting a gasto from the
 * consolidated /gastos/:id endpoint (used by the Historial tab) must cascade
 * to the originating GastoUnico row when tipo_origen is 'unico', since that
 * relationship is 1:1 — unlike recurrentes/débitos/compras, which generate
 * many gastos from one definition, a GastoUnico has no other occurrence to
 * represent it once its one Gasto row is gone.
 */

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockGasto = {
  findOne: jest.fn(),
  findAll: jest.fn()
};

const mockGastoUnicoService = {
  deleteWithAssociatedGasto: jest.fn()
};

const mockResponseHelper = {
  sendError: jest.fn(),
  sendSuccess: jest.fn(),
  sendPaginatedSuccess: jest.fn(),
  sendValidationError: jest.fn()
};

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../src/models/index.js', () => ({
  Gasto: mockGasto,
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {},
  FrecuenciaGasto: {}
}));

jest.unstable_mockModule('../../../src/services/gastoGenerator.service.js', () => ({
  GastoGeneratorService: { generatePendingExpenses: jest.fn() }
}));

jest.unstable_mockModule('../../../src/utils/responseHelper.js', () => mockResponseHelper);

jest.unstable_mockModule('../../../src/utils/filterBuilder.js', () => ({
  FilterBuilder: class {
    addOptionalIds() { return this; }
  },
  buildQueryOptions: jest.fn(),
  buildPagination: jest.fn()
}));

jest.unstable_mockModule('../../../src/utils/aggregationHelper.js', () => ({
  buildDateRangeWhere: jest.fn(),
  buildResumen: jest.fn(),
  GASTOS_AGRUPACIONES: {}
}));

jest.unstable_mockModule('../../../src/controllers/api/base.controller.js', () => ({
  BaseController: class {
    constructor(model, modelName) {
      this.model = model;
      this.modelName = modelName;
    }
  }
}));

jest.unstable_mockModule('../../../src/middlewares/container.middleware.js', () => ({
  getService: jest.fn(() => mockGastoUnicoService)
}));

const { GastoController } = await import('../../../src/controllers/api/gasto.controller.js');
const { getService } = await import('../../../src/middlewares/container.middleware.js');

describe('GastoController.delete', () => {
  let gastoController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    getService.mockReturnValue(mockGastoUnicoService);
    gastoController = new GastoController();

    mockReq = {
      user: { id: 1 },
      params: { id: '42' },
      container: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('returns 404 when the gasto does not exist for this user', async () => {
    mockGasto.findOne.mockResolvedValue(null);

    await gastoController.delete(mockReq, mockRes);

    expect(mockResponseHelper.sendError).toHaveBeenCalledWith(mockRes, 404, 'Gasto no encontrado');
    expect(mockGastoUnicoService.deleteWithAssociatedGasto).not.toHaveBeenCalled();
  });

  test('delegates to gastoUnicoService.deleteWithAssociatedGasto for tipo_origen "unico"', async () => {
    const destroy = jest.fn();
    mockGasto.findOne.mockResolvedValue({
      id: 42,
      tipo_origen: 'unico',
      id_origen: 7,
      destroy
    });

    await gastoController.delete(mockReq, mockRes);

    expect(getService).toHaveBeenCalledWith(mockReq, 'gastoUnicoService');
    expect(mockGastoUnicoService.deleteWithAssociatedGasto).toHaveBeenCalledWith(7);
    expect(destroy).not.toHaveBeenCalled();
    expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, { message: 'Gasto eliminado correctamente' });
  });

  test.each(['recurrente', 'debito_automatico', 'compra'])(
    'destroys the consolidated row directly for tipo_origen "%s" (does not touch the origin definition)',
    async (tipoOrigen) => {
      const destroy = jest.fn();
      mockGasto.findOne.mockResolvedValue({
        id: 42,
        tipo_origen: tipoOrigen,
        id_origen: 7,
        destroy
      });

      await gastoController.delete(mockReq, mockRes);

      expect(destroy).toHaveBeenCalledTimes(1);
      expect(mockGastoUnicoService.deleteWithAssociatedGasto).not.toHaveBeenCalled();
      expect(mockResponseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, { message: 'Gasto eliminado correctamente' });
    }
  );

  test('destroys the consolidated row directly when id_origen is missing, even if tipo_origen is "unico"', async () => {
    const destroy = jest.fn();
    mockGasto.findOne.mockResolvedValue({
      id: 42,
      tipo_origen: 'unico',
      id_origen: null,
      destroy
    });

    await gastoController.delete(mockReq, mockRes);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(mockGastoUnicoService.deleteWithAssociatedGasto).not.toHaveBeenCalled();
  });

  test('returns 500 when deleteWithAssociatedGasto throws', async () => {
    const destroy = jest.fn();
    mockGasto.findOne.mockResolvedValue({
      id: 42,
      tipo_origen: 'unico',
      id_origen: 7,
      destroy
    });
    const error = new Error('db exploded');
    mockGastoUnicoService.deleteWithAssociatedGasto.mockRejectedValue(error);

    await gastoController.delete(mockReq, mockRes);

    expect(mockResponseHelper.sendError).toHaveBeenCalledWith(mockRes, 500, 'Error al eliminar Gasto', error.message);
  });
});
