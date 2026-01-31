import { connectDatabase, closeDatabase } from './postgres.js';
import sequelizeInstance from './postgres.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations({ standalone = false } = {}) {
  const sequelize = sequelizeInstance;

  try {
    // If running standalone (CLI), connect first
    if (standalone) {
      await connectDatabase();
    }

    logger.info('Iniciando migraciones de base de datos...');

    // Leer todos los archivos .sql de la carpeta migrations
    const migrationsDir = path.join(__dirname, '../../migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.info('No se encontro carpeta de migraciones, saltando...');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ejecutar en orden alfabético

    logger.info(`Se encontraron ${files.length} archivos de migracion`);

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

    let executed = 0;

    // Ejecutar cada migración que no se haya ejecutado
    for (const file of files) {
      if (executedFiles.includes(file)) {
        continue;
      }

      logger.info(`Ejecutando migracion: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Remove explicit COMMIT/BEGIN statements (Sequelize manages its own transactions)
        const cleanSql = sql
          .replace(/^\s*COMMIT\s*;\s*$/gmi, '')
          .replace(/^\s*BEGIN\s*;\s*$/gmi, '');

        await sequelize.query(cleanSql);

        // Registrar migración como ejecutada
        await sequelize.query(
          'INSERT INTO finanzas.migrations (filename) VALUES (?) ON CONFLICT (filename) DO NOTHING',
          { replacements: [file] }
        );

        logger.info(`Migracion ${file} ejecutada exitosamente`);
        executed++;
      } catch (error) {
        const pgCode = error.original?.code;
        // Known safe errors: column/table/constraint already exists, duplicate object
        if (['42701', '42P07', '42710'].includes(pgCode)) {
          logger.warn(`${file}: Objeto ya existe (${pgCode}), registrando como ejecutada...`);
          await sequelize.query(
            'INSERT INTO finanzas.migrations (filename) VALUES (?) ON CONFLICT (filename) DO NOTHING',
            { replacements: [file] }
          );
          executed++;
        } else {
          // Log but don't crash - skip this migration and continue with the rest
          logger.error(`Error ejecutando ${file} (code: ${pgCode}):`, error.message);
        }
      }
    }

    if (executed > 0) {
      logger.info(`${executed} migraciones ejecutadas correctamente`);
    } else {
      logger.info('No hay migraciones pendientes');
    }

  } catch (error) {
    // Log but don't crash the app - migrations are best-effort on startup
    logger.error('Error durante las migraciones:', error.message);
  } finally {
    // Only close if running standalone (CLI mode)
    if (standalone) {
      await closeDatabase();
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations({ standalone: true })
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
