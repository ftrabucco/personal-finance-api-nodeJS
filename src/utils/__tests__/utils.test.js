// Simple test for utilities to verify they work
import { createError } from '../createError.js';
import { helpers } from '../handlebars.helpers.js';
import logger from '../logger.js';

describe('Utilities', () => {
  describe('createError', () => {
    test('should be a function', () => {
      expect(typeof createError).toBe('function');
    });

    test('should create error with status and message', () => {
      const error = createError({ status: 400, message: 'Bad Request' });
      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad Request');
    });

    test('should use default status 500 when not provided', () => {
      const error = createError({ message: 'Server Error' });
      expect(error.status).toBe(500);
      expect(error.message).toBe('Server Error');
    });
  });

  describe('handlebars.helpers', () => {
    test('should be an object', () => {
      expect(typeof helpers).toBe('object');
    });

    test('should have formatMoney helper', () => {
      expect(typeof helpers.formatMoney).toBe('function');
    });

    test('should have formatDate helper', () => {
      expect(typeof helpers.formatDate).toBe('function');
    });

    test('should have eq helper', () => {
      expect(typeof helpers.eq).toBe('function');
    });

    test('should have selected helper', () => {
      expect(typeof helpers.selected).toBe('function');
    });

    test('should have checked helper', () => {
      expect(typeof helpers.checked).toBe('function');
    });

    test('should have formatDayOfMonth helper', () => {
      expect(typeof helpers.formatDayOfMonth).toBe('function');
    });
  });

  describe('logger', () => {
    test('should be an object', () => {
      expect(typeof logger).toBe('object');
    });

    test('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    test('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });
  });
});
