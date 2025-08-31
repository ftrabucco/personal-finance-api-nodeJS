import { connectDatabase, closeDatabase } from './postgres.js';
import logger from '../utils/logger.js';

async function seedInitialData() {
  let sequelize;
  
  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();
    
    // Insertar datos de configuración
    await sequelize.query(`
      INSERT INTO finanzas.categorias_gasto (nombre_categoria) VALUES
        ('Alquiler'),
        ('Supermercado'),
        ('Transporte'),
        ('Salud'),
        ('Entretenimiento'),
        ('Suscripciones'),
        ('Farmacia'),
        ('Hogar / Mantenimiento'),
        ('Tarjetas de crédito / Deudas'),
        ('Peluquería / Cuidado personal'),
        ('Regalos'),
        ('Mascotas'),
        ('Impuestos / Servicios públicos'),
        ('Ahorro / Inversión'),
        ('Compras personales'),
        ('Vacaciones / Viajes'),
        ('Otros')
      ON CONFLICT (nombre_categoria) DO NOTHING;
    `);

    await sequelize.query(`
      INSERT INTO finanzas.tipos_pago (nombre, permite_cuotas) VALUES
        ('Efectivo', false),
        ('Débito', false),
        ('Crédito', true),
        ('Transferencia', false)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    await sequelize.query(`
      INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia) VALUES
        ('Unico'),
        ('Mensual'),
        ('Anual')
      ON CONFLICT (nombre_frecuencia) DO NOTHING;
    `);

    await sequelize.query(`
      INSERT INTO finanzas.importancias_gasto (nombre_importancia) VALUES
        ('Esencial'),
        ('Nice to have'),
        ('Prescindible'),
        ('No debería')
      ON CONFLICT (nombre_importancia) DO NOTHING;
    `);

    await sequelize.query(`
      INSERT INTO finanzas.tarjetas (nombre, tipo, banco, dia_mes_cierre, dia_mes_vencimiento, permite_cuotas) VALUES
        ('Debito Galicia', 'debito', 'Galicia', NULL, NULL, false),
        ('Credito Mastercard', 'credito', 'Galicia', 15, 5, true)
      ON CONFLICT DO NOTHING;
    `);

    await sequelize.query(`
      INSERT INTO finanzas.usuarios (nombre, email, password) VALUES
        ('Fran', 'fran@gmail.com', '1234')
      ON CONFLICT (email) DO NOTHING;
    `);

    logger.info('Datos de configuración insertados correctamente');
    
  } catch (error) {
    logger.error('Error durante el seeding:', error);
    throw error;
  } finally {
    if (sequelize) {
      await closeDatabase();
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedInitialData()
    .then(() => {
      logger.info('Seeding completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en seeding:', error);
      process.exit(1);
    });
}

export { seedInitialData };
