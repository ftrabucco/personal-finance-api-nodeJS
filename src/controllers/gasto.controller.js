import { GastoGeneratorService } from '../services/gastoGenerator.service.js';
import logger from '../utils/logger.js';

export const generateGastos = async (req, res) => {
  try {
    const results = await GastoGeneratorService.generateAllPendingGastos();
    res.json({
      message: 'Generación de gastos completada',
      results
    });
  } catch (error) {
    logger.error('Error en el endpoint de generación de gastos:', { error });
    res.status(500).json({
      error: 'Error al generar gastos',
      details: error.message
    });
  }
}; 