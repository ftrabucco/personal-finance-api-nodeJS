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
import { defineUsuario } from './Usuario.model.js';
import { defineTipoCambio } from './TipoCambio.model.js';
import { defineFuenteIngreso } from './fuenteIngreso.model.js';
import { defineIngresoUnico } from './ingresoUnico.model.js';
import { defineIngresoRecurrente } from './ingresoRecurrente.model.js';
import { defineCuentaBancaria } from './CuentaBancaria.model.js';
import { definePreferenciasUsuario } from './PreferenciasUsuario.model.js';

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
  dialectOptions: {
    ...(isProduction && process.env.DB_SSL !== 'false' && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    })
  },
  define: {
    timestamps: true,
    underscored: true,
    schema: 'finanzas'
  }
});

// Definimos los modelos - ORDEN IMPORTANTE: tablas referenciadas deben ir primero
const models = {
  // 1. Tablas base (sin FKs a otras tablas del app)
  Usuario: defineUsuario(sequelize),
  TipoPago: defineTipoPago(sequelize),
  CategoriaGasto: defineCategoriaGasto(sequelize),
  FrecuenciaGasto: defineFrecuenciaGasto(sequelize),
  ImportanciaGasto: defineImportanciaGasto(sequelize),
  TipoCambio: defineTipoCambio(sequelize),
  FuenteIngreso: defineFuenteIngreso(sequelize),

  // 2. Tablas que dependen de Usuario
  Tarjeta: defineTarjeta(sequelize),
  CuentaBancaria: defineCuentaBancaria(sequelize),
  PreferenciasUsuario: definePreferenciasUsuario(sequelize),

  // 3. Tablas que dependen de las anteriores
  Gasto: defineGasto(sequelize),
  Compra: defineCompra(sequelize),
  DebitoAutomatico: defineDebitoAutomatico(sequelize),
  GastoRecurrente: defineGastoRecurrente(sequelize),
  GastoUnico: defineGastoUnico(sequelize),
  IngresoUnico: defineIngresoUnico(sequelize),
  IngresoRecurrente: defineIngresoRecurrente(sequelize)
};

// Relacionamos los modelos
setupAssociations(models);

export { sequelize };
export const {
  Gasto,
  TipoPago,
  CategoriaGasto,
  FrecuenciaGasto,
  ImportanciaGasto,
  Compra,
  DebitoAutomatico,
  GastoRecurrente,
  GastoUnico,
  Tarjeta,
  Usuario,
  TipoCambio,
  FuenteIngreso,
  IngresoUnico,
  IngresoRecurrente,
  CuentaBancaria,
  PreferenciasUsuario
} = models;
