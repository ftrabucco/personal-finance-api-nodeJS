import { jest } from '@jest/globals';

// Mock the models before importing the controller
const mockGasto = {
  findOne: jest.fn()
};

const mockGastoUnico = {
  findByPk: jest.fn(),
  sequelize: {
    transaction: jest.fn()
  }
};

// Mock the models module
jest.unstable_mockModule('../../../models/index.js', () => ({
  Gasto: mockGasto,
  GastoUnico: mockGastoUnico,
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {}
}));

// Mock the service
jest.unstable_mockModule('../../../services/gastoUnico.service.js', () => ({
  GastoUnicoService: {
    update: jest.fn()
  }
}));

// Now import the controller and service
const { GastoUnicoController } = await import('../gastoUnico.controller.js');
const { GastoUnicoService } = await import('../../../services/gastoUnico.service.js');

describe('GastoUnicoController', () => {
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;
  let mockTransaction;

  // Mock data
  const mockGastoUnico = {
    id: 1,
    descripcion: 'Gasto de prueba',
    monto: 1000.50,
    fecha: '2025-09-03',
    categoria_gasto_id: 1,
    importancia_gasto_id: 1,
    tipo_pago_id: 1,
    tarjeta_id: 1,
    procesado: true,
    toJSON: () => ({
      id: 1,
      descripcion: 'Gasto de prueba',
      monto: 1000.50,
      fecha: '2025-09-03',
      categoria_gasto_id: 1,
      importancia_gasto_id: 1,
      tipo_pago_id: 1,
      tarjeta_id: 1,
      procesado: true
    })
  };

  const mockGasto = {
    id: 1,
    descripcion: 'Gasto de prueba',
    monto_ars: 1000.50,
    fecha: '2025-09-03',
    categoria_gasto_id: 1,
    tipo_pago_id: 1,
    tarjeta_id: 1,
    tipo_origen: 'unico',
    id_origen: 1,
    update: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create controller instance
    controller = new GastoUnicoController();
    
    // Setup default mocks
    mockGastoUnico.findByPk.mockResolvedValue(mockGastoUnico);
    mockGasto.findOne.mockResolvedValue(mockGasto);
    
    // Mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true)
    };
    
    mockGastoUnico.sequelize.transaction.mockImplementation((callback) => {
      return callback(mockTransaction);
    });
    
    // Mock request
    mockReq = {
      params: { id: '1' },
      body: { 
        descripcion: 'Gasto de prueba actualizado',
        monto: 1500.75,
        fecha: '2025-10-15',
        categoria_gasto_id: 2,
        tipo_pago_id: 2,
        tarjeta_id: 2
      },
      query: {}
    };
    
    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Mock service response
    GastoUnicoService.update.mockImplementation(async (id, data) => ({
      ...mockGastoUnico.toJSON(),
      ...data
    }));
    
    // Mock validateExistingIds
    controller.validateExistingIds = jest.fn().mockResolvedValue([]);
    
    // Mock validateGastoUnicoFields
    controller.validateGastoUnicoFields = jest.fn().mockReturnValue(true);
  });

  describe('update', () => {
    test('should update GastoUnico and associated Gasto when processed', async () => {
      // Act
      await controller.update(mockReq, mockRes);
      
      // Assert
      expect(GastoUnicoService.update).toHaveBeenCalledWith(
        '1',
        mockReq.body
      );
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ...mockGastoUnico.toJSON(),
        ...mockReq.body
      }));
    });
    
    test('should handle GastoUnico not found', async () => {
      // Arrange
      GastoUnicoService.update.mockResolvedValue(null);
      
      // Act
      await controller.update(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error al actualizar el gasto único'
      });
    });
    
    test('should handle validation errors', async () => {
      // Arrange
      const validationErrors = [{ field: 'categoria_gasto_id', message: 'Categoría no válida' }];
      controller.validateExistingIds.mockResolvedValue(validationErrors);
      
      // Act
      await controller.update(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: validationErrors
      });
    });
    
    test('should handle invalid date', async () => {
      // Arrange
      mockReq.body.fecha = 'invalid-date';
      controller.validateGastoUnicoFields.mockReturnValue(false);
      
      // Act
      await controller.update(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Campos inválidos',
        details: 'La fecha es requerida y debe ser válida'
      });
    });
    
    test('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      GastoUnicoService.update.mockRejectedValue(error);
      
      // Act
      await controller.update(mockReq, mockRes, mockNext);
      
      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
