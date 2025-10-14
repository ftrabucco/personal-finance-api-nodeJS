import logger from '../utils/logger.js';

/**
 * Base service class that provides common CRUD operations
 * Implements DRY principle by eliminating code duplication across services
 */
export class BaseService {
  constructor(model) {
    this.model = model;
    this.modelName = model.name;
  }

  /**
   * Create a new record
   */
  async create(data) {
    try {
      const record = await this.model.create(data);
      logger.info(`${this.modelName} created successfully`, {
        id: record.id,
        model: this.modelName
      });
      return record;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}`, {
        error: error.message,
        data,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Find all records with optional filters and includes
   */
  async findAll(options = {}) {
    try {
      const records = await this.model.findAll(options);
      logger.debug(`Retrieved ${records.length} ${this.modelName} records`);
      return records;
    } catch (error) {
      logger.error(`Error retrieving ${this.modelName} records`, {
        error: error.message,
        options,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id, options = {}) {
    try {
      const record = await this.model.findByPk(id, options);
      if (!record) {
        logger.warn(`${this.modelName} not found`, {
          id,
          model: this.modelName
        });
      }
      return record;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by ID`, {
        error: error.message,
        id,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id, data) {
    try {
      const record = await this.model.findByPk(id);
      if (!record) {
        logger.warn(`${this.modelName} not found for update`, {
          id,
          model: this.modelName
        });
        return null;
      }

      const updatedRecord = await record.update(data);
      logger.info(`${this.modelName} updated successfully`, {
        id,
        model: this.modelName
      });
      return updatedRecord;
    } catch (error) {
      logger.error(`Error updating ${this.modelName}`, {
        error: error.message,
        id,
        data,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id) {
    try {
      const record = await this.model.findByPk(id);
      if (!record) {
        logger.warn(`${this.modelName} not found for deletion`, {
          id,
          model: this.modelName
        });
        return null;
      }

      await record.destroy();
      logger.info(`${this.modelName} deleted successfully`, {
        id,
        model: this.modelName
      });
      return record;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}`, {
        error: error.message,
        id,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Count records with optional filters
   */
  async count(options = {}) {
    try {
      const count = await this.model.count(options);
      logger.debug(`Counted ${count} ${this.modelName} records`);
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.modelName} records`, {
        error: error.message,
        options,
        model: this.modelName
      });
      throw error;
    }
  }

  /**
   * Find records with pagination
   */
  async findWithPagination(options = {}, limit = null, offset = 0) {
    try {
      const queryOptions = { ...options };

      if (limit) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);
      }

      const { rows, count } = await this.model.findAndCountAll(queryOptions);

      const result = {
        data: rows,
        total: count
      };

      if (limit) {
        result.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: parseInt(offset) + parseInt(limit) < count,
          hasPrev: parseInt(offset) > 0,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        };
      }

      logger.debug(`Retrieved paginated ${this.modelName} records`, {
        total: count,
        returned: rows.length,
        limit,
        offset
      });

      return result;
    } catch (error) {
      logger.error(`Error retrieving paginated ${this.modelName} records`, {
        error: error.message,
        options,
        limit,
        offset,
        model: this.modelName
      });
      throw error;
    }
  }
}
