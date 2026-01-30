import { connectDatabase, closeDatabase } from './postgres.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  let sequelize;

  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();

    logger.info('🔄 Iniciando migraciones de base de datos...');

    // Leer todos los archivos .sql de la carpeta migrations
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ejecutar en orden alfabético

    logger.info(`📂 Se encontraron ${files.length} archivos de migración`);

    // Crear tabla de migraciones si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS finanzas.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Obtener migraciones ya ejecutadas
    const [executedMigrations] = await sequelize.query(
      'SELECT filename FROM finanzas.migrations'
    );
    const executedFiles = executedMigrations.map(m => m.filename);

    // Ejecutar cada migración que no se haya ejecutado
    for (const file of files) {
      if (executedFiles.includes(file)) {
        logger.info(`⏭️  Saltando ${file} (ya ejecutada)`);
        continue;
      }

      logger.info(`▶️  Ejecutando migración: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await sequelize.query(sql);

        // Registrar migración como ejecutada
        await sequelize.query(
          'INSERT INTO finanzas.migrations (filename) VALUES (?)',
          { replacements: [file] }
        );

        logger.info(`✅ Migración ${file} ejecutada exitosamente`);
      } catch (error) {
        logger.error(`❌ Error ejecutando ${file}:`, error);
        throw error;
      }
    }

    logger.info('✅ Todas las migraciones se ejecutaron correctamente');

  } catch (error) {
    logger.error('❌ Error durante las migraciones:', error);
    throw error;
  } finally {
    if (sequelize) {
      await closeDatabase();
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      logger.info('Migraciones completadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en migraciones:', error);
      process.exit(1);
    });
}

export { runMigrations };
