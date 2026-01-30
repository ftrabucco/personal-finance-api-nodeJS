import { connectDatabase, closeDatabase } from './postgres.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';

async function seedInitialData() {
  let sequelize;

  try {
    // Conectar a PostgreSQL
    sequelize = await connectDatabase();

    logger.info('🌱 Iniciando seeding de datos...');

    // 1. ✨ CATEGORÍAS DE GASTO - Más completas y organizadas
    logger.info('📂 Insertando categorías de gasto...');
    await sequelize.query(`
      INSERT INTO finanzas.categorias_gasto (nombre_categoria) VALUES
        -- 🏠 Vivienda
        ('Alquiler'),
        ('Expensas'),
        ('Servicios (luz, gas, agua)'),
        ('Internet / Cable'),
        ('Hogar / Mantenimiento'),
        -- 🛒 Alimentación
        ('Supermercado'),
        ('Almacén / Verdulería'),
        ('Delivery / Comida'),
        ('Restaurantes'),
        -- 🚗 Transporte
        ('Transporte público'),
        ('Combustible'),
        ('Uber / Taxi'),
        ('Mantenimiento vehículo'),
        -- 💊 Salud
        ('Farmacia'),
        ('Médicos / Consultas'),
        ('Obra social / Prepaga'),
        -- 🎯 Personal
        ('Peluquería / Estética'),
        ('Ropa / Calzado'),
        ('Gimnasio / Deportes'),
        -- 🎮 Entretenimiento
        ('Streaming / Suscripciones'),
        ('Cine / Teatro'),
        ('Libros / Cursos'),
        ('Hobbies'),
        -- 💳 Financiero
        ('Tarjetas de crédito'),
        ('Préstamos'),
        ('Seguros'),
        ('Impuestos'),
        -- 👥 Social
        ('Regalos'),
        ('Salidas con amigos'),
        ('Familia'),
        -- 🐕 Mascotas
        ('Veterinario'),
        ('Comida mascotas'),
        -- 💰 Otros
        ('Ahorro / Inversión'),
        ('Emergencias'),
        ('Otros')
      ON CONFLICT (nombre_categoria) DO NOTHING;
    `);

    // 2. 💳 TIPOS DE PAGO
    logger.info('💳 Insertando tipos de pago...');
    await sequelize.query(`
      INSERT INTO finanzas.tipos_pago (nombre, permite_cuotas) VALUES
        ('Efectivo', false),
        ('Débito', false),
        ('Crédito', true),
        ('Transferencia', false),
        ('MercadoPago', false),
        ('Cheque', false)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 3. 🔄 FRECUENCIAS DE GASTO
    logger.info('🔄 Insertando frecuencias de gasto...');
    await sequelize.query(`
      INSERT INTO finanzas.frecuencias_gasto (nombre_frecuencia) VALUES
        ('Único'),
        ('Diario'),
        ('Semanal'),
        ('Mensual'),
        ('Bimestral'),
        ('Trimestral'),
        ('Semestral'),
        ('Anual')
      ON CONFLICT (nombre_frecuencia) DO NOTHING;
    `);

    // 4. ⭐ IMPORTANCIAS DE GASTO
    logger.info('⭐ Insertando importancias de gasto...');
    await sequelize.query(`
      INSERT INTO finanzas.importancias_gasto (nombre_importancia) VALUES
        ('Esencial'),
        ('Importante'),
        ('Nice to have'),
        ('Prescindible'),
        ('No debería')
      ON CONFLICT (nombre_importancia) DO NOTHING;
    `);

    // 5. 👤 USUARIO EJEMPLO - Con password hasheado
    logger.info('👤 Creando usuario ejemplo...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [userResults] = await sequelize.query(`
      INSERT INTO finanzas.usuarios (nombre, email, password) VALUES
        ('Francisco Trabucco', 'francisco@gmail.com', '${hashedPassword}')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password
      RETURNING id;
    `);

    const userId = userResults[0]?.id || 1; // Fallback en caso de que ya exista

    // 6. 💳 TARJETAS EJEMPLO - Vinculadas al usuario
    logger.info('💳 Insertando tarjetas ejemplo...');
    await sequelize.query(`
      INSERT INTO finanzas.tarjetas (nombre, tipo, banco, dia_mes_cierre, dia_mes_vencimiento, permite_cuotas, usuario_id) VALUES
        ('Débito Galicia', 'debito', 'Banco Galicia', NULL, NULL, false, ${userId}),
        ('Crédito Visa Galicia', 'credito', 'Banco Galicia', 15, 5, true, ${userId}),
        ('Crédito Mastercard BBVA', 'credito', 'BBVA', 10, 28, true, ${userId}),
        ('Mercado Pago', 'debito', 'MercadoPago', NULL, NULL, false, ${userId})
      ON CONFLICT DO NOTHING;
    `);

    // 7. 💡 EJEMPLOS DE GASTOS - Para probar el sistema inmediatamente
    logger.info('💡 Insertando ejemplos de gastos...');

    // Obtener IDs para referencias
    const [categorias] = await sequelize.query('SELECT id, nombre_categoria FROM finanzas.categorias_gasto WHERE nombre_categoria IN (\'Supermercado\', \'Alquiler\', \'Netflix\', \'Streaming / Suscripciones\', \'Transporte público\');');
    const [importancias] = await sequelize.query('SELECT id, nombre_importancia FROM finanzas.importancias_gasto WHERE nombre_importancia IN (\'Esencial\', \'Important\', \'Nice to have\');');
    const [tiposPago] = await sequelize.query('SELECT id, nombre FROM finanzas.tipos_pago WHERE nombre IN (\'Efectivo\', \'Débito\', \'Crédito\');');

    const supermercadoId = categorias.find(c => c.nombre_categoria === 'Supermercado')?.id || 1;
    const alquilerId = categorias.find(c => c.nombre_categoria === 'Alquiler')?.id || 2;
    const streamingId = categorias.find(c => c.nombre_categoria === 'Streaming / Suscripciones')?.id || 3;
    const esencialId = importancias.find(i => i.nombre_importancia === 'Esencial')?.id || 1;
    const niceToHaveId = importancias.find(i => i.nombre_importancia === 'Nice to have')?.id || 3;
    const debitoId = tiposPago.find(t => t.nombre === 'Débito')?.id || 1;
    const creditoId = tiposPago.find(t => t.nombre === 'Crédito')?.id || 3;

    // Gasto Único de ejemplo
    await sequelize.query(`
      INSERT INTO finanzas.gastos_unico (descripcion, monto, fecha, categoria_gasto_id, importancia_gasto_id, tipo_pago_id, usuario_id, procesado) VALUES
        ('Supermercado Coto - compra semanal', 15000, '2025-01-15', ${supermercadoId}, ${esencialId}, ${debitoId}, ${userId}, true),
        ('Farmacia - medicamentos', 8500, '2025-01-14', ${supermercadoId}, ${esencialId}, ${debitoId}, ${userId}, true)
      ON CONFLICT DO NOTHING;
    `);

    // Gasto Recurrente de ejemplo
    await sequelize.query(`
      INSERT INTO finanzas.gastos_recurrentes (descripcion, monto, dia_de_pago, categoria_gasto_id, importancia_gasto_id, tipo_pago_id, frecuencia_gasto_id, usuario_id, activo, created_at, updated_at) VALUES
        ('Alquiler departamento', 180000, 5, ${alquilerId}, ${esencialId}, ${debitoId}, 4, ${userId}, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);

    // Débito Automático de ejemplo
    await sequelize.query(`
      INSERT INTO finanzas.debitos_automaticos (descripcion, monto, dia_de_pago, categoria_gasto_id, importancia_gasto_id, tipo_pago_id, frecuencia_gasto_id, usuario_id, activo, created_at, updated_at) VALUES
        ('Netflix Premium', 5990, 12, ${streamingId}, ${niceToHaveId}, ${creditoId}, 4, ${userId}, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);

    logger.info('✅ Datos de configuración y ejemplos insertados correctamente');

  } catch (error) {
    logger.error('❌ Error durante el seeding:', error);
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
