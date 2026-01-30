import ExchangeRateService from '../services/exchangeRate.service.js';
import logger from '../utils/logger.js';

/**
 * Bootstrap para inicialización del tipo de cambio
 *
 * Se ejecuta después de que la base de datos está conectada
 * para asegurar que siempre haya un tipo de cambio disponible.
 */
export async function initializeExchangeRate() {
  try {
    logger.info('💱 [Bootstrap] Verificando tipo de cambio...');

    const tipoCambio = await ExchangeRateService.ensureExchangeRateExists();

    logger.info('✅ [Bootstrap] Tipo de cambio disponible', {
      fecha: tipoCambio.fecha,
      venta: tipoCambio.valor_venta_usd_ars,
      fuente: tipoCambio.fuente
    });

    return tipoCambio;
  } catch (error) {
    // Log pero no lanzar - la app puede funcionar sin TC inicial
    // El usuario puede cargarlo manualmente después
    logger.error('❌ [Bootstrap] No se pudo inicializar tipo de cambio', {
      error: error.message,
      code: error.code
    });

    return null;
  }
}

export default { initializeExchangeRate };
