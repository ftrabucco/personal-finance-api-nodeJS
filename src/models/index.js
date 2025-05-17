import { Sequelize } from 'sequelize';
import { defineGasto } from './Gasto.model.js';
import { defineTipoPago } from './TipoPago.model.js';
import { defineCategoriaGasto } from './CategoriaGasto.model.js';
import { defineFrecuenciaGasto } from './FrecuenciaGasto.model.js';
import { defineImportanciaGasto } from './ImportanciaGasto.model.js';
import { setupAssociations } from './associations.js';
import { defineCompra } from './Compra.model.js';
import { defineDebitoAutomatico } from './DebitoAutomatico.model.js';
import { defineGastoRecurrente } from './GastoRecurrente.model.js';
import { defineGastoUnico } from './GastoUnico.model.js';
import { defineTarjeta } from './Tarjeta.model.js';
import { defineUsuario } from './Uuario.model.js';


/*
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres', // o el que uses
  logging: false,
});
*/
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});
await sequelize.sync({ alter: true })

// Definimos los modelos
const models = {
  Gasto: defineGasto(sequelize),
  TipoPago: defineTipoPago(sequelize),
  CategoriaGasto: defineCategoriaGasto(sequelize),
  FrecuenciaGasto: defineFrecuenciaGasto(sequelize),
  ImportanciaGasto: defineImportanciaGasto(sequelize),
  Compra : defineCompra(sequelize),
  DebitoAutomatico : defineDebitoAutomatico(sequelize),
  GastoRecurrente : defineGastoRecurrente(sequelize),
  GastoUnico : defineGastoUnico(sequelize),
  Tarjeta : defineTarjeta(sequelize),
  Usuario : defineUsuario(sequelize),
};

// Relacionamos los modelos
setupAssociations(models);

export { sequelize };
export const { Gasto, TipoPago, CategoriaGasto, FrecuenciaGasto,
   ImportanciaGasto, Compra, DebitoAutomatico, GastoRecurrente,
   GastoUnico, Tarjeta, Usuario
 } = models;
