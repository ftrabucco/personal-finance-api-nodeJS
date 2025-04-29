// modelos/seed.js
import { sequelize, CategoriaGasto, TipoPago, FrecuenciaGasto, ImportanciaGasto } from './index.js';

async function seedInitialData() {
  try {
    await sequelize.sync({ alter: true });

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
      console.log('Categorías de gasto creadas');
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
      console.log('Tipos de pago creados');
    }

    // Frecuencia de Gasto
    const frecuenciaGastoExistentes = await FrecuenciaGasto.count();
    if (frecuenciaGastoExistentes === 0) {
      await FrecuenciaGasto.bulkCreate([
        { nombre_frecuencia: 'Unico' },
        { nombre_frecuencia: 'Mensual' },
        { nombre_frecuencia: 'Anual' }
      ]);
      console.log('Frecuencias de gasto creadas');
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
      console.log('Importancias de gasto creadas');
    }

    console.log('Seeding finalizado.');
  } catch (error) {
    console.error('Error durante el seeding:', error);
  } finally {
    await sequelize.close();
  }
}

seedInitialData();
