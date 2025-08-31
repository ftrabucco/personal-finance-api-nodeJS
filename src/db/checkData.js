import { connectDatabase, closeDatabase } from './postgres.js';
import logger from '../utils/logger.js';

async function checkData() {
  let sequelize;
  
  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();
    
    // Verificar categorías
    const categorias = await sequelize.query('SELECT * FROM finanzas.categorias_gasto LIMIT 5;');
    logger.info('Categorías encontradas:', categorias[0].length);
    
    // Verificar tipos de pago
    const tiposPago = await sequelize.query('SELECT * FROM finanzas.tipos_pago;');
    logger.info('Tipos de pago encontrados:', tiposPago[0].length);
    
    // Verificar frecuencias
    const frecuencias = await sequelize.query('SELECT * FROM finanzas.frecuencias_gasto;');
    logger.info('Frecuencias encontradas:', frecuencias[0].length);
    
    // Verificar importancias
    const importancias = await sequelize.query('SELECT * FROM finanzas.importancias_gasto;');
    logger.info('Importancias encontradas:', importancias[0].length);
    
    // Verificar tarjetas
    const tarjetas = await sequelize.query('SELECT * FROM finanzas.tarjetas;');
    logger.info('Tarjetas encontradas:', tarjetas[0].length);
    
    // Verificar usuarios
    const usuarios = await sequelize.query('SELECT * FROM finanzas.usuarios;');
    logger.info('Usuarios encontrados:', usuarios[0].length);
    
    // Verificar si hay gastos
    const gastos = await sequelize.query('SELECT COUNT(*) as total FROM finanzas.gastos;');
    logger.info('Total de gastos:', gastos[0][0].total);
    
    // Verificar si hay compras
    const compras = await sequelize.query('SELECT COUNT(*) as total FROM finanzas.compras;');
    logger.info('Total de compras:', compras[0][0].total);
    
    // Verificar si hay débitos automáticos
    const debitosAutomaticos = await sequelize.query('SELECT COUNT(*) as total FROM finanzas.debitos_automaticos;');
    logger.info('Total de débitos automáticos:', debitosAutomaticos[0][0].total);
    
    // Verificar si hay gastos recurrentes
    const gastosRecurrentes = await sequelize.query('SELECT COUNT(*) as total FROM finanzas.gastos_recurrentes;');
    logger.info('Total de gastos recurrentes:', gastosRecurrentes[0][0].total);
    
    // Verificar si hay gastos únicos
    const gastosUnicos = await sequelize.query('SELECT COUNT(*) as total FROM finanzas.gastos_unicos;');
    logger.info('Total de gastos únicos:', gastosUnicos[0][0].total);
    
  } catch (error) {
    logger.error('Error al verificar datos:', error);
    throw error;
  } finally {
    if (sequelize) {
      await closeDatabase();
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkData()
    .then(() => {
      logger.info('Verificación de datos completada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en verificación:', error);
      process.exit(1);
    });
}

export { checkData };
