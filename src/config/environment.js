import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Configuración por entorno
const environments = {
  development: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'finanzas_personal',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      dialect: 'postgres',
      logging: console.log,
      timezone: '-03:00',
      define: {
        timestamps: true,
        underscored: true,
        schema: 'finanzas'
      },
      sync: {
        alter: true
      }
    },
    server: {
      port: parseInt(process.env.PORT) || 3030,
      host: '0.0.0.0'
    },
    security: {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000 // Aumentado para desarrollo/testing
      },
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      },
      helmet: {
        contentSecurityPolicy: false // Deshabilitado para desarrollo
      }
    },
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      format: 'dev'
    },
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED !== 'false', // Por defecto habilitado en desarrollo
      cronPattern: process.env.SCHEDULER_CRON_PATTERN || '5 0 * * *', // 00:05 AM diario
      timezone: process.env.SCHEDULER_TIMEZONE || 'America/Argentina/Buenos_Aires',
      runOnStartup: process.env.SCHEDULER_RUN_ON_STARTUP === 'true' // Por defecto false
    }
  },
  
  test: {
    database: {
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT) || parseInt(process.env.DB_PORT) || 5432,
      database: process.env.TEST_DB_NAME || 'finanzas_personal_test',
      username: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres123',
      dialect: 'postgres',
      logging: false, // Sin logs en tests
      timezone: '-03:00',
      define: {
        timestamps: true,
        underscored: true,
        schema: 'finanzas'
      },
      sync: {
        force: true // Recrear tablas en cada test
      }
    },
    server: {
      port: parseInt(process.env.PORT) || 3031,
      host: '0.0.0.0'
    },
    security: {
      rateLimit: {
        windowMs: 1000,
        max: 1000 // Sin límite en tests
      },
      cors: {
        origin: true
      },
      helmet: {
        contentSecurityPolicy: false
      }
    },
    logging: {
      level: 'error',
      format: 'minimal'
    },
    scheduler: {
      enabled: false, // Deshabilitado en tests
      cronPattern: '5 0 * * *',
      timezone: 'America/Argentina/Buenos_Aires',
      runOnStartup: false
    }
  },
  
  production: {
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: 'postgres',
      logging: false, // Sin logs SQL en producción
      timezone: '-03:00',
      pool: {
        max: 20,
        min: 5,
        idle: 30000,
        acquire: 60000
      },
      define: {
        timestamps: true,
        underscored: true,
        schema: 'finanzas'
      },
      sync: {
        alter: false // No alterar estructura en producción
      }
    },
    server: {
      port: parseInt(process.env.PORT) || 3030,
      host: '0.0.0.0'
    },
    security: {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50 // Más restrictivo en producción
      },
      cors: {
        origin: process.env.CORS_ORIGIN || false,
        credentials: true
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      }
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'combined'
    },
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED === 'true', // Explícitamente habilitado en producción
      cronPattern: process.env.SCHEDULER_CRON_PATTERN || '5 0 * * *', // 00:05 AM diario
      timezone: process.env.SCHEDULER_TIMEZONE || 'America/Argentina/Buenos_Aires',
      runOnStartup: process.env.SCHEDULER_RUN_ON_STARTUP === 'true'
    }
  }
};

// Obtener configuración actual
const currentEnv = process.env.NODE_ENV || 'development';
const config = environments[currentEnv];

if (!config) {
  throw new Error(`Configuración no encontrada para el entorno: ${currentEnv}`);
}

// Validar variables requeridas en producción
if (currentEnv === 'production') {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
  }
}

// Configuración adicional
config.app = {
  name: process.env.APP_NAME || 'Personal Finance API',
  version: process.env.APP_VERSION || '1.0.0',
  url: process.env.APP_URL || `http://localhost:${config.server.port}`,
  env: currentEnv
};

config.mcp = {
  port: parseInt(process.env.MCP_PORT) || 3031,
  enabled: process.env.MCP_ENABLED === 'true'
};

config.monitoring = {
  healthCheck: process.env.HEALTH_CHECK_ENABLED !== 'false',
  metrics: process.env.METRICS_ENABLED !== 'false'
};

export default config;
export { currentEnv, environments };