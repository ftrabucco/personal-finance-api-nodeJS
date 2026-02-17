import { ProyeccionService } from '../../services/proyeccion.service.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

/**
 * Get expense projection for N months ahead
 * GET /api/proyeccion?meses=3
 */
export const obtenerProyeccion = async (req, res) => {
  try {
    const userId = req.user.id;
    const meses = parseInt(req.query.meses) || 3;

    logger.debug('Generating expense projection', {
      userId,
      meses
    });

    const proyeccion = await ProyeccionService.projectExpenses(userId, meses);

    return sendSuccess(res, proyeccion);
  } catch (error) {
    logger.error('Error al obtener proyección:', { error: error.message, stack: error.stack });
    return sendError(res, 500, 'Error al generar proyección de gastos', error.message);
  }
};
