import { sequelize } from './models/index.js';
import logger from './utils/logger.js';

async function resetDatabase() {
  try {
    logger.info('Iniciando reset de la base de datos...');

    // Cerrar todas las conexiones existentes
    await sequelize.close();
    logger.info('Conexiones cerradas.');

    // Eliminar todas las tablas
    await sequelize.drop();
    logger.info('Todas las tablas eliminadas.');

    // Volver a sincronizar el modelo, creando las tablas
    await sequelize.sync({ force: true });
    logger.info('Tablas recreadas correctamente.');

    logger.info('Reset de base de datos completado exitosamente.');
    process.exit(0);
  } catch (error) {
    logger.error('Error durante el reset de la base de datos:', error);
    process.exit(1);
  }
}

resetDatabase();
