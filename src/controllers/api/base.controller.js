import logger from '../../utils/logger.js';

export class BaseController {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
  }

  // Método genérico para validar IDs existentes
  async validateExistingIds(data, relationships) {
    const errors = [];
    for (const [field, { model, name }] of Object.entries(relationships)) {
      if (data[field]) {
        const exists = await model.findByPk(data[field]);
        if (!exists) {
          errors.push(`${name} con ID ${data[field]} no existe`);
        }
      }
    }
    return errors;
  }

  // Método genérico para obtener todos los registros
  async getAll(req, res) {
    try {
      const items = await this.model.findAll({
        include: this.getIncludes()
      });
      return res.json(items);
    } catch (error) {
      logger.error(`Error al obtener ${this.modelName}:`, { error });
      return res.status(500).json({ 
        error: `Error al obtener ${this.modelName}`,
        details: error.message 
      });
    }
  }

  // Método genérico para obtener un registro por ID
  async getById(req, res) {
    try {
      const item = await this.model.findByPk(req.params.id, {
        include: this.getIncludes()
      });
      
      if (!item) {
        return res.status(404).json({ 
          error: `${this.modelName} no encontrado` 
        });
      }
      
      return res.json(item);
    } catch (error) {
      logger.error(`Error al obtener ${this.modelName}:`, { error });
      return res.status(500).json({ 
        error: `Error al obtener ${this.modelName}`,
        details: error.message 
      });
    }
  }

  // Método genérico para crear un registro
  async create(req, res) {
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      const item = await this.model.create(req.body);
      logger.info(`${this.modelName} creado:`, { id: item.id });
      
      return res.status(201).json(item);
    } catch (error) {
      logger.error(`Error al crear ${this.modelName}:`, { error });
      return res.status(500).json({ 
        error: `Error al crear ${this.modelName}`,
        details: error.message 
      });
    }
  }

  // Método genérico para actualizar un registro
  async update(req, res) {
    try {
      const item = await this.model.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({ 
          error: `${this.modelName} no encontrado` 
        });
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      await item.update(req.body);
      logger.info(`${this.modelName} actualizado:`, { id: item.id });
      
      return res.json(item);
    } catch (error) {
      logger.error(`Error al actualizar ${this.modelName}:`, { error });
      return res.status(500).json({ 
        error: `Error al actualizar ${this.modelName}`,
        details: error.message 
      });
    }
  }

  // Método genérico para eliminar un registro
  async delete(req, res) {
    try {
      const item = await this.model.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({ 
          error: `${this.modelName} no encontrado` 
        });
      }

      await item.destroy();
      logger.info(`${this.modelName} eliminado:`, { id: req.params.id });
      
      return res.json({ 
        message: `${this.modelName} eliminado correctamente` 
      });
    } catch (error) {
      logger.error(`Error al eliminar ${this.modelName}:`, { error });
      return res.status(500).json({ 
        error: `Error al eliminar ${this.modelName}`,
        details: error.message 
      });
    }
  }

  // Método a implementar en las clases hijas
  getIncludes() {
    return [];
  }

  // Método a implementar en las clases hijas
  getRelationships() {
    return {};
  }
} 