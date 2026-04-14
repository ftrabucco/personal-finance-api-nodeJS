import logger from '../../utils/logger.js';
import { sendError, sendSuccess } from '../../utils/responseHelper.js';
import balanceService from '../../services/balance.service.js';

/**
 * Obtiene la evolución mensual del balance del usuario
 * GET /api/balance/evolucion?desde=2025-01&hasta=2026-04
 */
export async function getEvolucionBalance(req, res) {
  try {
    const usuarioId = req.user.id;
    const { desde, hasta } = req.query;

    const evolucion = await balanceService.getEvolucionMensual(usuarioId, desde, hasta);

    return sendSuccess(res, evolucion);
  } catch (error) {
    logger.error('Error al obtener evolución del balance:', { error });
    return sendError(res, 500, 'Error al obtener evolución del balance', error.message);
  }
}

export default {
  getEvolucionBalance
};
