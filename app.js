import express, { json } from 'express';
const app = express();
import sequelize from './src/db.js';
import gastosRoutes from './src/routes/gastos.routes.js';
import { errorMiddleware } from './src/middlewares/errorMiddleware.js';
import logger from './src/utils/logger.js';
import { requestLogger } from './src/middlewares/requestLogger.js';

app.use(json());
app.use(requestLogger);
// Rutas
app.use('/gastos-api', gastosRoutes);
app.use(errorMiddleware);

// Iniciar servidor y sincronizar base de datos
const PORT = process.env.PORT || 3000;
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

  