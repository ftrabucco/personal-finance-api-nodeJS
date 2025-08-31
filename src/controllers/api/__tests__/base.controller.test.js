// Simple test for BaseController to verify it works
import { BaseController } from '../base.controller.js';

describe('BaseController', () => {
  let controller;
  let mockModel;

  beforeEach(() => {
    // Create a simple mock model
    mockModel = {
      findAll: () => Promise.resolve([]),
      findByPk: () => Promise.resolve(null),
      create: () => Promise.resolve({ id: 1 }),
      update: () => Promise.resolve({ id: 1 }),
      destroy: () => Promise.resolve()
    };
    
    // Create controller instance
    controller = new BaseController(mockModel, 'TestModel');
  });

  describe('Constructor', () => {
    test('should set model and modelName correctly', () => {
      expect(controller.model).toBe(mockModel);
      expect(controller.modelName).toBe('TestModel');
    });
  });

  describe('Basic functionality', () => {
    test('should have required methods', () => {
      expect(typeof controller.getAll).toBe('function');
      expect(typeof controller.getById).toBe('function');
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
    });

    test('should have getIncludes method', () => {
      expect(typeof controller.getIncludes).toBe('function');
      expect(Array.isArray(controller.getIncludes())).toBe(true);
    });

    test('should have getRelationships method', () => {
      expect(typeof controller.getRelationships).toBe('function');
      expect(typeof controller.getRelationships()).toBe('object');
    });
  });

  describe('validateExistingIds method', () => {
    test('should return empty array when no relationships to validate', async () => {
      const result = await controller.validateExistingIds({}, {});
      expect(result).toEqual([]);
    });

    test('should return errors when related IDs do not exist', async () => {
      const data = { category_id: 1 };
      const relationships = {
        category_id: { model: mockModel, name: 'Category' }
      };
      
      // Mock findByPk to return null (not found)
      mockModel.findByPk = () => Promise.resolve(null);
      
      const result = await controller.validateExistingIds(data, relationships);
      
      expect(result).toEqual(['Category con ID 1 no existe']);
    });
  });
});
