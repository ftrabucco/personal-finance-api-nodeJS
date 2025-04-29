import express, { json } from 'express';
const app = express();
import sequelize from './src/db.js';
import gastosRoutes from './src/routes/gastos.routes.js';
import { errorMiddleware } from './src/middlewares/errorMiddleware.js';

app.use(json());

// Rutas
app.use('/gastos-api', gastosRoutes);
app.use(errorMiddleware);

// Iniciar servidor y sincronizar base de datos
const PORT = process.env.PORT || 3000;
sequelize.sync({ force: false }) // cambia a true si querés reiniciar la DB
  .then(() => {
    console.log('Base de datos conectada');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
  });

  