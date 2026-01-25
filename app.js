import express from 'express';
const app = express();
import { connectDatabase } from './src/db/postgres.js';
import apiRouter from './src/routes/api/index.routes.js';
import viewRouter from './src/routes/views/index.routes.js';
import { errorMiddleware } from './src/middlewares/errorMiddleware.js';
import logger from './src/utils/logger.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import exphbs from 'express-handlebars';
import path from 'path';
import { helpers } from './src/utils/handlebars.helpers.js';
import methodOverride from 'method-override';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import config from './src/config/environment.js';
import security from './src/middlewares/security.middleware.js';
import ExpenseScheduler from './src/schedulers/expenseScheduler.js';

// Middlewares de seguridad (antes que todo)
app.use(security.cors);
app.use(security.helmet);
app.use(security.rateLimit);
app.use(security.sanitize);
app.use(security.securityLogger);

// Configuración para Handlebars
const hbs = exphbs.create({
  helpers,
  defaultLayout: 'main',
  extname: '.handlebars'
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'views'));

// Configuración del proxy (para obtener IP real detrás de proxy)
app.set('trust proxy', 1);

// Para leer datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Validación de Content-Type
app.use(security.validateContentType);

// Configuración de method-override para PUT y DELETE de las vistas
app.use(methodOverride('_method'));

app.use(requestLogger);

// Health check endpoint (antes de otros middlewares)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
    version: config.app.version,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Configuración Swagger
const swaggerDocument = YAML.load('./docs/api/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes (JSON endpoints)
app.use('/api', apiRouter);

// View Routes (HTML pages)
app.use('/', viewRouter);

app.use(errorMiddleware);

// Iniciar servidor y conectar a PostgreSQL
async function startServer() {
  try {
    // Conectar a PostgreSQL
    await connectDatabase();

    // Iniciar scheduler de gastos
    ExpenseScheduler.start();

    // Iniciar servidor
    app.listen(config.server.port, config.server.host, () => {
      logger.info('🚀 Servidor iniciado exitosamente');
      logger.info(`📍 URL: ${config.app.url}`);
      logger.info(`🌍 Entorno: ${config.app.env}`);
      logger.info(`📚 Documentación API: ${config.app.url}/api-docs`);
      logger.info(`💊 Health Check: ${config.app.url}/health`);

      if (config.mcp.enabled) {
        logger.info(`🔗 MCP Server: http://localhost:${config.mcp.port}`);
      }

      // Log del estado del scheduler
      const schedulerStatus = ExpenseScheduler.getStatus();
      if (schedulerStatus.isRunning) {
        logger.info(`📅 Expense Scheduler: Activo (próxima ejecución: ${schedulerStatus.nextExecution})`);
      } else {
        logger.info('📅 Expense Scheduler: Inactivo');
      }
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Solo iniciar servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Exportar app para tests
export default app;

