import { jest } from '@jest/globals';

// Mock the models before importing the controller
const mockGastoModel = {
  findOne: jest.fn()
};

const mockGastoUnicoModel = {
  findByPk: jest.fn(),
  sequelize: {
    transaction: jest.fn()
  }
};

// Mock the models module
jest.unstable_mockModule('../../../models/index.js', () => ({
  Gasto: mockGastoModel,
  GastoUnico: mockGastoUnicoModel,
  CategoriaGasto: {},
  ImportanciaGasto: {},
  TipoPago: {},
  Tarjeta: {}
}));

// Mock the service class
const mockGastoUnicoServiceInstance = {
  update: jest.fn(),
  createWithGastoReal: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn()
};

jest.unstable_mockModule('../../../services/gastoUnico.service.js', () => ({
  GastoUnicoService: jest.fn().mockImplementation(() => mockGastoUnicoServiceInstance)
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
  const mockGastoUnicoData = {
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

  const mockGastoData = {
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
    mockGastoUnicoModel.findByPk.mockResolvedValue(mockGastoUnicoData);
    mockGastoModel.findOne.mockResolvedValue(mockGastoData);

    // Mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true)
    };

    mockGastoUnicoModel.sequelize.transaction.mockImplementation((callback) => {
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
    mockGastoUnicoServiceInstance.update.mockImplementation(async (id, data) => ({
      ...mockGastoUnicoData.toJSON(),
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
      expect(mockGastoUnicoServiceInstance.update).toHaveBeenCalledWith(
        '1',
        mockReq.body
      );
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ...mockGastoUnicoData.toJSON(),
        ...mockReq.body
      }));
    });
    
    test('should handle GastoUnico not found', async () => {
      // Arrange
      mockGastoUnicoServiceInstance.update.mockResolvedValue(null);
      
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
      mockGastoUnicoServiceInstance.update.mockRejectedValue(error);
      
      // Act
      await controller.update(mockReq, mockRes, mockNext);
      
      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
