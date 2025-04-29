import { sequelize } from '../models/index.js';

async function resetDatabase() {
  try {
    console.log('Borrando y recreando la base de datos...');

    // Elimina todas las tablas
    await sequelize.drop();
    console.log('Todas las tablas eliminadas.');

    // Vuelve a sincronizar el modelo, creando las tablas
    await sequelize.sync({ force: true });
    console.log('Tablas creadas de nuevo.');

    process.exit(0);
  } catch (error) {
    console.error(' Error reseteando la base de datos:', error);
    process.exit(1);
  }
}

resetDatabase();
