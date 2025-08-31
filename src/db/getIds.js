import { connectDatabase, closeDatabase } from './postgres.js';
import logger from '../utils/logger.js';

async function getIds() {
  let sequelize;
  
  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();
    
    // Obtener categorías con IDs
    const categorias = await sequelize.query('SELECT id, nombre_categoria FROM finanzas.categorias_gasto ORDER BY id;');
    logger.info('Categorías disponibles:');
    categorias[0].forEach(cat => {
      logger.info(`  ID ${cat.id}: ${cat.nombre_categoria}`);
    });
    
    // Obtener tipos de pago con IDs
    const tiposPago = await sequelize.query('SELECT id, nombre FROM finanzas.tipos_pago ORDER BY id;');
    logger.info('\nTipos de pago disponibles:');
    tiposPago[0].forEach(tipo => {
      logger.info(`  ID ${tipo.id}: ${tipo.nombre}`);
    });
    
    // Obtener frecuencias con IDs
    const frecuencias = await sequelize.query('SELECT id, nombre_frecuencia FROM finanzas.frecuencias_gasto ORDER BY id;');
    logger.info('\nFrecuencias disponibles:');
    frecuencias[0].forEach(freq => {
      logger.info(`  ID ${freq.id}: ${freq.nombre_frecuencia}`);
    });
    
    // Obtener importancias con IDs
    const importancias = await sequelize.query('SELECT id, nombre_importancia FROM finanzas.importancias_gasto ORDER BY id;');
    logger.info('\nImportancias disponibles:');
    importancias[0].forEach(imp => {
      logger.info(`  ID ${imp.id}: ${imp.nombre_importancia}`);
    });
    
    // Obtener tarjetas con IDs
    const tarjetas = await sequelize.query('SELECT id, nombre, tipo FROM finanzas.tarjetas ORDER BY id;');
    logger.info('\nTarjetas disponibles:');
    tarjetas[0].forEach(tarj => {
      logger.info(`  ID ${tarj.id}: ${tarj.nombre} (${tarj.tipo})`);
    });
    
  } catch (error) {
    logger.error('Error al obtener IDs:', error);
    throw error;
  } finally {
    if (sequelize) {
      await closeDatabase();
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  getIds()
    .then(() => {
      logger.info('\nConsulta de IDs completada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en consulta:', error);
      process.exit(1);
    });
}

export { getIds };
