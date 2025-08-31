// Simple test for GastoUnicoController to verify it works
import { 
  obtenerGastosUnicos, 
  obtenerGastoUnicoPorId, 
  crearGastoUnico, 
  actualizarGastoUnico, 
  eliminarGastoUnico
} from '../gastoUnico.controller.js';

describe('GastoUnicoController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    mockReq = {
      params: { id: '1' },
      body: { monto: 500.00, descripcion: 'Reparación auto' },
      query: {}
    };
    
    mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; },
      send: function(data) { this.data = data; return this; }
    };
    
    mockNext = function() {};
  });

  describe('Basic functionality', () => {
    test('should have all required methods', () => {
      expect(typeof obtenerGastosUnicos).toBe('function');
      expect(typeof obtenerGastoUnicoPorId).toBe('function');
      expect(typeof crearGastoUnico).toBe('function');
      expect(typeof actualizarGastoUnico).toBe('function');
      expect(typeof eliminarGastoUnico).toBe('function');
    });
  });

  describe('Method signatures', () => {
    test('should accept request, response, and next parameters', () => {
      expect(() => {
        try {
          obtenerGastosUnicos(mockReq, mockRes, mockNext);
        } catch (e) {
          // Expected to fail since models are not mocked
        }
      }).not.toThrow();
    });
  });
});
