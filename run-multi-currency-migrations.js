import { connectDatabase, closeDatabase } from './src/db/postgres.js';
import logger from './src/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMultiCurrencyMigrations() {
  let sequelize;

  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();

    logger.info('💱 Ejecutando migraciones de multi-moneda...');

    const migrationsToRun = [
      '005_create_tipos_cambio_table.sql',
      '006_add_multi_currency_to_gastos_unico.sql',
      '007_add_multi_currency_to_compras.sql',
      '008_add_multi_currency_to_gastos_recurrentes.sql',
      '009_add_multi_currency_to_debitos_automaticos.sql',
      '010_add_multi_currency_to_gastos.sql'
    ];

    for (const file of migrationsToRun) {
      logger.info(`▶️  Ejecutando: ${file}`);
      const filePath = path.join(__dirname, 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await sequelize.query(sql);
        logger.info(`✅ ${file} ejecutada exitosamente`);

        // Registrar en tabla de migraciones
        await sequelize.query(
          'INSERT INTO finanzas.migrations (filename) VALUES (?) ON CONFLICT (filename) DO NOTHING',
          { replacements: [file] }
        );
      } catch (error) {
        // Si el error es porque la columna ya existe, ignorar y continuar
        if (error.original?.code === '42701' || error.original?.code === '42P07') {
          logger.warn(`⚠️  ${file}: Columnas/tablas ya existen, saltando...`);
          // Aún así registrar como ejecutada
          await sequelize.query(
            'INSERT INTO finanzas.migrations (filename) VALUES (?) ON CONFLICT (filename) DO NOTHING',
            { replacements: [file] }
          );
        } else {
          logger.error(`❌ Error en ${file}:`, error.message);
          throw error;
        }
      }
    }

    logger.info('✅ Migraciones de multi-moneda completadas');

  } catch (error) {
    logger.error('❌ Error:', error);
    throw error;
  } finally {
    if (sequelize) {
      await closeDatabase();
    }
  }
}

runMultiCurrencyMigrations()
  .then(() => {
    logger.info('Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error:', error);
    process.exit(1);
  });
