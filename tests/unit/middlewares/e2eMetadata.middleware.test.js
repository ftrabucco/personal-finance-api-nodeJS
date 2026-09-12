import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventEmitter } from 'node:events';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

const { e2eMetadata } = await import('../../../src/middlewares/e2eMetadata.middleware.js');
const { requestLogger } = await import('../../../src/middlewares/requestLogger.js');

describe('E2E metadata middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      get: jest.fn()
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('attaches E2E metadata from request headers', () => {
    mockReq.get.mockImplementation((header) => {
      const headers = {
        'x-e2e-test-run-id': 'e2e-manual-001',
        'x-e2e-correlation-id': 'e2e-manual-001-CF-EXP-001-chromium-r0-abcd1234',
        'x-e2e-flow-id': 'CF-EXP-001'
      };

      return headers[header];
    });

    e2eMetadata(mockReq, mockRes, mockNext);

    expect(mockReq.e2eMetadata).toEqual({
      testRunId: 'e2e-manual-001',
      correlationId: 'e2e-manual-001-CF-EXP-001-chromium-r0-abcd1234',
      flowId: 'CF-EXP-001'
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('does not attach metadata when E2E headers are absent', () => {
    mockReq.get.mockReturnValue(undefined);

    e2eMetadata(mockReq, mockRes, mockNext);

    expect(mockReq.e2eMetadata).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('Request logger E2E metadata', () => {
  it('includes E2E metadata in structured request logs', () => {
    const mockReq = {
      method: 'POST',
      originalUrl: '/api/gastos-unicos',
      e2eMetadata: {
        testRunId: 'e2e-manual-001',
        correlationId: 'e2e-manual-001-CF-EXP-001-chromium-r0-abcd1234',
        flowId: 'CF-EXP-001'
      }
    };
    const mockRes = new EventEmitter();
    mockRes.statusCode = 201;
    const mockNext = jest.fn();

    requestLogger(mockReq, mockRes, mockNext);
    mockRes.emit('finish');

    expect(mockNext).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'HTTP request completed',
      expect.objectContaining({
        method: 'POST',
        path: '/api/gastos-unicos',
        statusCode: 201,
        e2e: mockReq.e2eMetadata
      })
    );
  });

  it('does not include E2E metadata when request has no E2E headers', () => {
    const mockReq = {
      method: 'GET',
      originalUrl: '/health'
    };
    const mockRes = new EventEmitter();
    mockRes.statusCode = 200;
    const mockNext = jest.fn();

    requestLogger(mockReq, mockRes, mockNext);
    mockRes.emit('finish');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'HTTP request completed',
      expect.not.objectContaining({
        e2e: expect.anything()
      })
    );
  });
});
