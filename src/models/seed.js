// modelos/seed.js
import logger from '../utils/logger.js';
import {
  sequelize, CategoriaGasto, TipoPago, FrecuenciaGasto, ImportanciaGasto,
  Compra, DebitoAutomatico, GastoRecurrente, GastoUnico,
  Tarjeta, Usuario
} from './index.js';

async function seedInitialData() {
  try {
    // Forzar recreación de tablas
    await sequelize.sync({ force: true });
    logger.info('Base de datos reiniciada');

    // Categorías de Gasto
    const categoriasExistentes = await CategoriaGasto.count();
    if (categoriasExistentes === 0) {
      await CategoriaGasto.bulkCreate([
        { nombre_categoria: 'Alquiler' },
        { nombre_categoria: 'Supermercado' },
        { nombre_categoria: 'Transporte' },
        { nombre_categoria: 'Salud' },
        { nombre_categoria: 'Entretenimiento' },
        { nombre_categoria: 'Suscripciones' },
        { nombre_categoria: 'Farmacia' },
        { nombre_categoria: 'Hogar / Mantenimiento' },
        { nombre_categoria: 'Tarjetas de crédito / Deudas' },
        { nombre_categoria: 'Peluquería / Cuidado personal' },
        { nombre_categoria: 'Regalos' },
        { nombre_categoria: 'Mascotas' },
        { nombre_categoria: 'Impuestos / Servicios públicos' },
        { nombre_categoria: 'Ahorro / Inversión' },
        { nombre_categoria: 'Compras personales' },
        { nombre_categoria: 'Vacaciones / Viajes' },
        { nombre_categoria: 'Otros' },
      ]);
      logger.info('Categorías de gasto creadas');
    }

    // Tipos de Pago
    const tiposPagoExistentes = await TipoPago.count();
    if (tiposPagoExistentes === 0) {
      await TipoPago.bulkCreate([
        { nombre: 'Efectivo', permite_cuotas: false },
        { nombre: 'Débito', permite_cuotas: false },
        { nombre: 'Crédito', permite_cuotas: true },
        { nombre: 'Transferencia', permite_cuotas: false }
      ]);
      logger.info('Tipos de pago creados');
    }

    // Frecuencia de Gasto
    const frecuenciaGastoExistentes = await FrecuenciaGasto.count();
    if (frecuenciaGastoExistentes === 0) {
      await FrecuenciaGasto.bulkCreate([
        { nombre_frecuencia: 'Unico' },
        { nombre_frecuencia: 'Mensual' },
        { nombre_frecuencia: 'Anual' }
      ]);
      logger.info('Frecuencias de gasto creadas');
    }

    // Importancia de Gasto
    const importanciaGastoExistentes = await ImportanciaGasto.count();
    if (importanciaGastoExistentes === 0) {
      await ImportanciaGasto.bulkCreate([
        { nombre_importancia: 'Esencial' },
        { nombre_importancia: 'Nice to have' },
        { nombre_importancia: 'Prescindible' },
        { nombre_importancia: 'No debería' }
      ]);
      logger.info('Importancias de gasto creadas');
    }

    // Tarjetas 
    const tarjetasExistentes = await Tarjeta.count();
    if (tarjetasExistentes === 0) {
      await Tarjeta.bulkCreate([
        {
          nombre: 'Debito Galicia',
          tipo: 'debito',
          banco: 'Galicia',
          dia_mes_cierre: null,
          dia_mes_vencimiento: null,
          permite_cuotas: false
        },
        {
          nombre: 'Credito Mastercard',
          tipo: 'credito',
          banco: 'Galicia',
          dia_mes_cierre: 15,
          dia_mes_vencimiento: 5,
          permite_cuotas: true
        },
      ]);
      logger.info('Tarjetas creadas');
    }

    // Usuarios
    const usuariosExistentes = await Usuario.count();
    if (usuariosExistentes === 0) {
      await Usuario.bulkCreate([
        {
          nombre: 'Fran',
          email: 'fran@gmail.com',
          password: '1234'
        }
      ]);
      logger.info('Usuarios creados');
    }

    // Compras (de ejemplo)
    const comprasExistentes = await Compra.count();
    if (comprasExistentes === 0) {
      await Compra.bulkCreate([
        {
          descripcion: 'Televisor Smart 55"',
          monto_total: 600000,
          cantidad_cuotas: 12,
          fecha_compra: new Date('2024-03-15'),
          categoria_gasto_id: 15, // Compras personales
          importancia_gasto_id: 2, // Nice to have
          tipo_pago_id: 3, // Crédito
          tarjeta_id: 2,
          pendiente_cuotas: true
        },
        {
          descripcion: 'Heladera',
          monto_total: 450000,
          cantidad_cuotas: 6,
          fecha_compra: new Date('2024-03-10'),
          categoria_gasto_id: 8, // Hogar
          importancia_gasto_id: 1, // Esencial
          tipo_pago_id: 3, // Crédito
          tarjeta_id: 2,
          pendiente_cuotas: true
        }
      ]);
      logger.info('Compras creadas');
    }

    // Débitos automáticos
    const debitosExistentes = await DebitoAutomatico.count();
    if (debitosExistentes === 0) {
      await DebitoAutomatico.bulkCreate([
        {
          descripcion: 'Spotify Premium',
          monto: 1500,
          dia_de_pago: 12,
          categoria_gasto_id: 6, // Suscripciones
          importancia_gasto_id: 2, // Nice to have
          frecuencia_gasto_id: 2, // Mensual
          tipo_pago_id: 2, // Débito
          tarjeta_id: 1,
          activo: true
        },
        {
          descripcion: 'ARCA Monotributo',
          monto: 37000,
          dia_de_pago: 20,
          categoria_gasto_id: 13, // Impuestos
          importancia_gasto_id: 1, // Esencial
          frecuencia_gasto_id: 2, // Mensual
          tipo_pago_id: 2, // Débito
          tarjeta_id: 1,
          activo: true
        },
        {
          descripcion: 'Netflix',
          monto: 4000,
          dia_de_pago: 15,
          categoria_gasto_id: 6, // Suscripciones
          importancia_gasto_id: 3, // Prescindible
          frecuencia_gasto_id: 2, // Mensual
          tipo_pago_id: 2, // Débito
          tarjeta_id: 1,
          activo: true
        }
      ]);
      logger.info('Débitos automáticos creados');
    }

    // Gastos recurrentes
    const gastosRecurrentesExistentes = await GastoRecurrente.count();
    if (gastosRecurrentesExistentes === 0) {
      await GastoRecurrente.bulkCreate([
        {
          descripcion: 'Alquiler mensual',
          monto: 120000,
          dia_de_pago: 1,
          frecuencia_gasto_id: 2, // Mensual
          categoria_gasto_id: 1, // Alquiler
          importancia_gasto_id: 1, // Esencial
          tipo_pago_id: 4, // Transferencia
          activo: true
        },
        {
          descripcion: 'Expensas',
          monto: 35000,
          dia_de_pago: 10,
          frecuencia_gasto_id: 2, // Mensual
          categoria_gasto_id: 8, // Hogar
          importancia_gasto_id: 1, // Esencial
          tipo_pago_id: 4, // Transferencia
          activo: true
        }
      ]);
      logger.info('Gastos recurrentes creados');
    }

    // Gastos únicos
    const gastosUnicosExistente = await GastoUnico.count();
    if (gastosUnicosExistente === 0) {
      await GastoUnico.bulkCreate([
        {
          descripcion: 'Arreglo auto, cambio correas',
          monto: 368000,
          fecha: new Date('2024-03-14'),
          categoria_gasto_id: 3, // Transporte
          importancia_gasto_id: 1, // Esencial
          tipo_pago_id: 4, // Transferencia
          tarjeta_id: 1
        },
        {
          descripcion: 'Regalo cumpleaños mamá',
          monto: 25000,
          fecha: new Date('2024-03-18'),
          categoria_gasto_id: 11, // Regalos
          importancia_gasto_id: 2, // Nice to have
          tipo_pago_id: 1, // Efectivo
          tarjeta_id: null
        }
      ]);
      logger.info('Gastos únicos creados');
    }

    logger.info('Seeding finalizado.');
  } catch (error) {
    logger.error('Error durante el seeding:', error);
  } finally {
    await sequelize.close();
  }
}

seedInitialData();
