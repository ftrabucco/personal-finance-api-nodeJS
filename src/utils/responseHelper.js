/**
 * Helper para generar respuestas HTTP estandarizadas
 */

/**
 * Respuesta de error estandarizada
 * @param {Object} res - Response object de Express
 * @param {number} status - HTTP status code
 * @param {string} error - Error message
 * @param {string|Array} details - Error details
 */
export function sendError(res, status = 500, error = 'Error del servidor', details = null) {
  const response = {
    success: false,
    error
  };

  if (details) {
    response.details = details;
  }

  // Include timestamp for debugging
  response.timestamp = new Date().toISOString();

  return res.status(status).json(response);
}

/**
 * Respuesta de éxito estandarizada
 * @param {Object} res - Response object de Express
 * @param {*} data - Data to send
 * @param {number} status - HTTP status code (default 200)
 * @param {string} message - Optional success message
 */
export function sendSuccess(res, data, status = 200, message = null) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  // Include metadata for arrays (collections)
  if (Array.isArray(data)) {
    response.meta = {
      total: data.length,
      type: 'collection'
    };
  }

  return res.status(status).json(response);
}

/**
 * Respuesta de paginación estandarizada
 * @param {Object} res - Response object de Express
 * @param {Array} data - Data array
 * @param {Object} pagination - Pagination info
 * @param {number} status - HTTP status code (default 200)
 */
export function sendPaginatedSuccess(res, data, pagination, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      total: pagination.total || data.length,
      type: 'collection',
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    }
  });
}

/**
 * Respuesta de validación de errores estandarizada
 * @param {Object} res - Response object de Express
 * @param {Array} errors - Validation errors
 */
export function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: 'Error de validación',
    details: errors,
    timestamp: new Date().toISOString()
  });
}
