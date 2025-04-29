import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});
sequelize.sync({ alter: true }) // SOLO PARA DESARROLLO

export default sequelize;
