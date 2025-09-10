import express, { json } from 'express';
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

// Configuración para Handlebars
const hbs = exphbs.create({
  helpers,
  defaultLayout: 'main',
  extname: '.handlebars'
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'views'));

// Para leer datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de method-override para PUT y DELETE de las vistas
app.use(methodOverride('_method'));

app.use(json());
app.use(requestLogger);

// Configuración Swagger
const swaggerDocument = YAML.load('./memoria/swagger_gastos.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes (JSON endpoints)
app.use('/api', apiRouter);

// View Routes (HTML pages)
app.use('/', viewRouter);

app.use(errorMiddleware);

// Iniciar servidor y conectar a PostgreSQL
const PORT = process.env.PORT || 3030;

async function startServer() {
  try {
    // Conectar a PostgreSQL
    await connectDatabase();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();

  