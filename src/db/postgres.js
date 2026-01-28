import { Sequelize } from 'sequelize';
import logger from '../utils/logger.js';

// Configuración para PostgreSQL
const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'finanzas_personal',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  schema: 'finanzas',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  timezone: '-03:00', // Asegura que las fechas se manejen en la zona horaria de Argentina
  dialectOptions: {
    useUTC: false, // No usar UTC para las fechas
    dateStrings: true, // Usar cadenas de fecha en lugar de objetos Date
    typeCast: true, // Permitir el casteo de tipos
    // SSL requerido para Render y otros proveedores cloud
    ...(isProduction && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    })
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: 'finanzas',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Función para conectar a la base de datos
export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Conexión a PostgreSQL establecida correctamente');

    // Sincronizar modelos (en desarrollo y producción, no en test)
    if (process.env.NODE_ENV !== 'test') {
      await sequelize.sync({ alter: true });
      logger.info('Modelos sincronizados con PostgreSQL');
    }

    return sequelize;
  } catch (error) {
    logger.error('Error al conectar a PostgreSQL:', error);
    throw error;
  }
}

// Función para cerrar la conexión
export async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('Conexión a PostgreSQL cerrada');
  } catch (error) {
    logger.error('Error al cerrar conexión a PostgreSQL:', error);
  }
}

export default sequelize;
