/**
 * Pagination helper utility to standardize pagination logic across controllers
 * Implements DRY principle by eliminating duplicate pagination code
 */
export class PaginationHelper {
  /**
   * Apply pagination parameters to query options
   * @param {Object} queryOptions - Sequelize query options
   * @param {Object} params - Pagination parameters
   * @param {string|number} params.limit - Number of records per page
   * @param {string|number} params.offset - Number of records to skip
   * @returns {Object} Updated query options and pagination info
   */
  static applyPagination(queryOptions, { limit, offset = 0 }) {
    if (!limit || limit === 'undefined') {
      return {
        queryOptions,
        pagination: null
      };
    }

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    // Validate pagination parameters
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw new Error('Offset must be a non-negative number');
    }

    queryOptions.limit = parsedLimit;
    queryOptions.offset = parsedOffset;

    return {
      queryOptions,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset
      }
    };
  }

  /**
   * Create standardized pagination response metadata
   * @param {number} count - Total number of records
   * @param {number} limit - Number of records per page
   * @param {number} offset - Number of records skipped
   * @returns {Object} Pagination metadata
   */
  static createPaginationResponse(count, limit, offset) {
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    const totalPages = Math.ceil(count / parsedLimit);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    return {
      total: count,
      limit: parsedLimit,
      offset: parsedOffset,
      totalPages,
      currentPage,
      hasNext: parsedOffset + parsedLimit < count,
      hasPrev: parsedOffset > 0,
      nextOffset: parsedOffset + parsedLimit < count ? parsedOffset + parsedLimit : null,
      prevOffset: parsedOffset > 0 ? Math.max(0, parsedOffset - parsedLimit) : null
    };
  }

  /**
   * Apply sorting parameters to query options
   * @param {Object} queryOptions - Sequelize query options
   * @param {Object} params - Sorting parameters
   * @param {string} params.sortBy - Field to sort by
   * @param {string} params.sortOrder - Sort direction ('asc' or 'desc')
   * @param {string} defaultSortBy - Default field to sort by
   * @returns {Object} Updated query options
   */
  static applySorting(queryOptions, { sortBy, sortOrder = 'desc' }, defaultSortBy = 'id') {
    const field = sortBy || defaultSortBy;
    const order = ['asc', 'desc'].includes(sortOrder?.toLowerCase())
      ? sortOrder.toLowerCase()
      : 'desc';

    queryOptions.order = [[field, order]];
    return queryOptions;
  }

  /**
   * Apply date range filtering to query options
   * @param {Object} queryOptions - Sequelize query options
   * @param {Object} params - Date range parameters
   * @param {string} params.fechaDesde - Start date (YYYY-MM-DD)
   * @param {string} params.fechaHasta - End date (YYYY-MM-DD)
   * @param {string} dateField - Database field name for date filtering
   * @returns {Object} Updated query options
   */
  static applyDateRange(queryOptions, { fechaDesde, fechaHasta }, dateField = 'fecha') {
    if (!queryOptions.where) {
      queryOptions.where = {};
    }

    const dateFilter = {};

    if (fechaDesde) {
      if (!this.isValidDate(fechaDesde)) {
        throw new Error('fechaDesde must be a valid date in YYYY-MM-DD format');
      }
      dateFilter.gte = fechaDesde;
    }

    if (fechaHasta) {
      if (!this.isValidDate(fechaHasta)) {
        throw new Error('fechaHasta must be a valid date in YYYY-MM-DD format');
      }
      dateFilter.lte = fechaHasta;
    }

    if (Object.keys(dateFilter).length > 0) {
      queryOptions.where[dateField] = dateFilter;
    }

    return queryOptions;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid date format
   */
  static isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  }

  /**
   * Create complete paginated response structure
   * @param {Array} data - Records returned from query
   * @param {number} count - Total number of records
   * @param {Object} pagination - Pagination parameters from applyPagination
   * @param {Object} additionalMeta - Additional metadata to include
   * @returns {Object} Complete response with data and metadata
   */
  static createResponse(data, count, pagination, additionalMeta = {}) {
    const response = {
      success: true,
      data,
      meta: {
        ...additionalMeta,
        count: data.length,
        total: count
      }
    };

    if (pagination) {
      response.meta.pagination = this.createPaginationResponse(
        count,
        pagination.limit,
        pagination.offset
      );
    }

    return response;
  }
}
