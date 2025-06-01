import express, { json } from 'express';
const app = express();
import sequelize from './src/db.js';
import apiRouter from './src/routes/api/index.routes.js';
import viewRouter from './src/routes/views/index.routes.js';
import { errorMiddleware } from './src/middlewares/errorMiddleware.js';
import logger from './src/utils/logger.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import exphbs from 'express-handlebars';
import path from 'path';
import { helpers } from './src/utils/handlebars.helpers.js';
import methodOverride from 'method-override';

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

// API Routes (JSON endpoints)
app.use('/api', apiRouter);

// View Routes (HTML pages)
app.use('/', viewRouter);

app.use(errorMiddleware);

// Iniciar servidor y sincronizar base de datos
const PORT = process.env.PORT || 3030;
sequelize.sync({ force: false }) // cambia a true si querés reiniciar la DB
  .then(() => {
    logger.info('Base de datos conectada');
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Error al conectar a la base de datos:', err);
  });

  