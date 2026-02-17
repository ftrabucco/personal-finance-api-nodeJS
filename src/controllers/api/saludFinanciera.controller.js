import { SaludFinancieraService } from '../../services/saludFinanciera.service.js';
import { sendSuccess, sendError } from '../../utils/responseHelper.js';
import logger from '../../utils/logger.js';

/**
 * Get financial health score analysis
 * GET /api/salud-financiera?periodo=mes
 */
export const obtenerSaludFinanciera = async (req, res) => {
  try {
    const userId = req.user.id;
    const periodo = req.query.periodo || 'mes';

    logger.debug('Calculating financial health score', {
      userId,
      periodo
    });

    const healthScore = await SaludFinancieraService.calculateHealthScore(userId, periodo);

    return sendSuccess(res, healthScore);
  } catch (error) {
    logger.error('Error al calcular salud financiera:', { error: error.message, stack: error.stack });
    return sendError(res, 500, 'Error al calcular salud financiera', error.message);
  }
};
