import { Op } from 'sequelize';
import { GastoRecurrente, DebitoAutomatico, Compra, GastoUnico, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import sequelize from '../db/postgres.js';
import logger from '../utils/logger.js';

export class GastoGeneratorService {
  static async generateFromGastoUnico(gastoUnico) {
    const transaction = await sequelize.transaction();
    try {
      // Crear gasto directamente desde gasto único
      const gasto = await Gasto.create({
        fecha: gastoUnico.fecha,
        monto_ars: gastoUnico.monto,
        descripcion: gastoUnico.descripcion,
        categoria_gasto_id: gastoUnico.categoria_gasto_id,
        importancia_gasto_id: gastoUnico.importancia_gasto_id,
        tipo_pago_id: gastoUnico.tipo_pago_id,
        tarjeta_id: gastoUnico.tarjeta_id,
        tipo_origen: 'unico',
        id_origen: gastoUnico.id
      }, { transaction });

      // Marcar como procesado
      await gastoUnico.update({ procesado: true }, { transaction });

      await transaction.commit();
      logger.info('Gasto generado desde gasto único:', { id: gasto.id, origen_id: gastoUnico.id });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde gasto único:', { error, gastoUnico_id: gastoUnico.id });
      throw error;
    }
  }

  static async generateFromCompra(compra) {
    const transaction = await sequelize.transaction();
    try {
      const today = new Date();
      const hoy = today.toISOString().split('T')[0];

      // Validate that all required foreign keys exist
      const missingKeys = [];
      if (!compra.categoria_gasto_id) missingKeys.push('categoria_gasto_id');
      if (!compra.importancia_gasto_id) missingKeys.push('importancia_gasto_id');
      if (!compra.tipo_pago_id) missingKeys.push('tipo_pago_id');
      
      if (missingKeys.length > 0) {
        await transaction.rollback();
        const error = new Error(`Missing required foreign keys: ${missingKeys.join(', ')}`);
        logger.error('Foreign key validation failed:', { 
          compra_id: compra.id,
          missing_keys: missingKeys,
          compra_data: compra.get({ plain: true })
        });
        throw error;
      }

      // Si la compra no tiene cuotas, solo generar si es la fecha de compra
      if (!compra.cantidad_cuotas || compra.cantidad_cuotas === 1) {
        const fechaCompra = compra.fecha_compra;
        
        // Solo generar si hoy es la fecha de compra
        if (fechaCompra !== hoy) {
          await transaction.rollback();
          return null;
        }

        const gasto = await Gasto.create({
          fecha: hoy,
          monto_ars: compra.monto_total,
          descripcion: compra.descripcion,
          categoria_gasto_id: compra.categoria_gasto_id,
          importancia_gasto_id: compra.importancia_gasto_id,
          tipo_pago_id: compra.tipo_pago_id,
          tarjeta_id: compra.tarjeta_id,
          tipo_origen: 'compra',
          id_origen: compra.id,
          cantidad_cuotas_totales: 1,
          cantidad_cuotas_pagadas: 1
        }, { transaction });

        // Marcar la compra como completada
        await compra.update({ pendiente_cuotas: false }, { transaction });

        await transaction.commit();
        logger.info('Gasto generado desde compra sin cuotas:', { id: gasto.id, origen_id: compra.id });
        return gasto;
      }

      // Para compras en cuotas, verificar si hoy toca alguna cuota
      const gastosExistentes = await Gasto.count({
        where: {
          tipo_origen: 'compra',
          id_origen: compra.id
        },
        transaction
      });

      // Si ya se generaron todas las cuotas, marcar como completada
      if (gastosExistentes >= compra.cantidad_cuotas) {
        await compra.update({ pendiente_cuotas: false }, { transaction });
        await transaction.commit();
        logger.info('Todas las cuotas ya fueron generadas para la compra:', { compra_id: compra.id });
        return null;
      }

      // Calcular la fecha de la próxima cuota que debería generarse
      const fechaCompra = new Date(compra.fecha_compra);
      const fechaProximaCuota = new Date(fechaCompra);
      
      // Agregar meses según el número de cuotas ya generadas
      const targetMonth = fechaCompra.getMonth() + gastosExistentes;
      const targetYear = fechaCompra.getFullYear() + Math.floor(targetMonth / 12);
      const finalMonth = targetMonth % 12;
      
      fechaProximaCuota.setFullYear(targetYear);
      fechaProximaCuota.setMonth(finalMonth);
      
      // Si el día original no existe en el mes destino, usar el último día del mes
      const lastDayOfMonth = new Date(targetYear, finalMonth + 1, 0).getDate();
      const targetDay = Math.min(fechaCompra.getDate(), lastDayOfMonth);
      fechaProximaCuota.setDate(targetDay);

      const fechaProximaCuotaStr = fechaProximaCuota.toISOString().split('T')[0];

      // Solo generar si hoy es la fecha de la próxima cuota
      if (hoy !== fechaProximaCuotaStr) {
        await transaction.rollback();
        return null;
      }

      // Calcular monto por cuota (redondeado a 2 decimales)
      const montoPorCuota = Math.round((compra.monto_total / compra.cantidad_cuotas) * 100) / 100;

      // Generar el gasto de la cuota que vence hoy
      const gasto = await Gasto.create({
        fecha: hoy, // Siempre usar la fecha actual
        monto_ars: montoPorCuota,
        descripcion: `${compra.descripcion} (Cuota ${gastosExistentes + 1}/${compra.cantidad_cuotas})`,
        categoria_gasto_id: compra.categoria_gasto_id,
        importancia_gasto_id: compra.importancia_gasto_id,
        tipo_pago_id: compra.tipo_pago_id,
        tarjeta_id: compra.tarjeta_id,
        tipo_origen: 'compra',
        id_origen: compra.id,
        cantidad_cuotas_totales: compra.cantidad_cuotas,
        cantidad_cuotas_pagadas: gastosExistentes + 1
      }, { transaction });

      // Si esta fue la última cuota, marcar como completada
      if (gastosExistentes + 1 >= compra.cantidad_cuotas) {
        await compra.update({ pendiente_cuotas: false }, { transaction });
      }

      await transaction.commit();
      logger.info('Gasto generado desde compra en cuotas:', { 
        id: gasto.id, 
        origen_id: compra.id,
        cuota: gastosExistentes + 1,
        total_cuotas: compra.cantidad_cuotas,
        fecha_vencimiento_original: fechaProximaCuotaStr,
        fecha_gasto: hoy,
        monto: montoPorCuota
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde compra:', { 
        error, 
        compra_id: compra.id,
        compra_data: compra.get({ plain: true })
      });
      throw error;
    }
  }

  static async generateFromGastoRecurrente(gastoRecurrente) {
    const transaction = await sequelize.transaction();
    try {
      const today = new Date();
      const diaHoy = today.getDate();
      const hoy = today.toISOString().split('T')[0];

      // Verificar si es el día de pago
      if (diaHoy !== gastoRecurrente.dia_de_pago) {
        await transaction.rollback();
        return null;
      }

      // Si ya se generó hoy, no hacer nada
      if (gastoRecurrente.ultima_fecha_generado === hoy) {
        await transaction.rollback();
        return null;
      }

      // Verificar si debe generar según la frecuencia
      if (gastoRecurrente.ultima_fecha_generado) {
        const ultimaFecha = new Date(gastoRecurrente.ultima_fecha_generado);
        const diasTranscurridos = Math.floor((today - ultimaFecha) / (1000 * 60 * 60 * 24));
        
        // Obtener información de frecuencia (asumiendo que existe una relación)
        const frecuencia = gastoRecurrente.frecuencia;
        let diasRequeridos = 30; // Default mensual
        
        if (frecuencia) {
          switch (frecuencia.nombre?.toLowerCase()) {
            case 'semanal':
              diasRequeridos = 7;
              break;
            case 'quincenal':
              diasRequeridos = 15;
              break;
            case 'mensual':
              diasRequeridos = 30;
              break;
            case 'bimestral':
              diasRequeridos = 60;
              break;
            case 'trimestral':
              diasRequeridos = 90;
              break;
            case 'anual':
              diasRequeridos = 365;
              break;
          }
        }

        // Si no ha pasado suficiente tiempo, no generar
        if (diasTranscurridos < diasRequeridos) {
          await transaction.rollback();
          return null;
        }
      }

      const gasto = await Gasto.create({
        fecha: hoy,
        monto_ars: gastoRecurrente.monto,
        descripcion: gastoRecurrente.descripcion,
        categoria_gasto_id: gastoRecurrente.categoria_gasto_id,
        importancia_gasto_id: gastoRecurrente.importancia_gasto_id,
        frecuencia_gasto_id: gastoRecurrente.frecuencia_gasto_id,
        tipo_pago_id: gastoRecurrente.tipo_pago_id,
        tarjeta_id: gastoRecurrente.tarjeta_id,
        tipo_origen: 'recurrente',
        id_origen: gastoRecurrente.id
      }, { transaction });

      // Actualizar última fecha de generación
      await gastoRecurrente.update({
        ultima_fecha_generado: hoy
      }, { transaction });

      await transaction.commit();
      logger.info('Gasto generado desde gasto recurrente:', { 
        id: gasto.id, 
        origen_id: gastoRecurrente.id,
        frecuencia: gastoRecurrente.frecuencia?.nombre,
        fecha: hoy
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde gasto recurrente:', { error, gastoRecurrente_id: gastoRecurrente.id });
      throw error;
    }
  }

  static async generateFromDebitoAutomatico(debitoAutomatico) {
    const transaction = await sequelize.transaction();
    try {
      const today = new Date();
      const diaHoy = today.getDate();
      const mesActual = today.getMonth();
      const anioActual = today.getFullYear();
      const hoy = today.toISOString().split('T')[0];

      // Calcular el día efectivo de pago para este mes
      // Si el día de pago es mayor que los días del mes actual, usar el último día
      const ultimoDiaDelMes = new Date(anioActual, mesActual + 1, 0).getDate();
      const diaEfectivoPago = Math.min(debitoAutomatico.dia_de_pago, ultimoDiaDelMes);

      // Verificar si es el día de pago
      if (diaHoy !== diaEfectivoPago) {
        await transaction.rollback();
        return null;
      }

      // Si ya se generó este mes, no hacer nada
      if (debitoAutomatico.ultimo_mes_generado === mesActual && 
          debitoAutomatico.ultimo_anio_generado === anioActual) {
        await transaction.rollback();
        return null;
      }

      // Verificar frecuencia para débitos no mensuales
      if (debitoAutomatico.frecuencia_gasto_id) {
        // Obtener información de frecuencia
        const frecuencia = await FrecuenciaGasto.findByPk(debitoAutomatico.frecuencia_gasto_id, { transaction });
        
        if (frecuencia && frecuencia.nombre?.toLowerCase() !== 'mensual') {
          // Para frecuencias no mensuales, verificar si debe generar
          if (debitoAutomatico.ultimo_mes_generado !== null && debitoAutomatico.ultimo_anio_generado !== null) {
            const ultimaFecha = new Date(debitoAutomatico.ultimo_anio_generado, debitoAutomatico.ultimo_mes_generado, 1);
            const mesesTranscurridos = (anioActual - ultimaFecha.getFullYear()) * 12 + (mesActual - ultimaFecha.getMonth());
            
            let mesesRequeridos = 1; // Default mensual
            switch (frecuencia.nombre?.toLowerCase()) {
              case 'bimestral':
                mesesRequeridos = 2;
                break;
              case 'trimestral':
                mesesRequeridos = 3;
                break;
              case 'anual':
                mesesRequeridos = 12;
                break;
            }
            
            if (mesesTranscurridos < mesesRequeridos) {
              await transaction.rollback();
              return null;
            }
          }
        }
      }

      const gasto = await Gasto.create({
        fecha: hoy,
        monto_ars: debitoAutomatico.monto,
        descripcion: debitoAutomatico.descripcion,
        categoria_gasto_id: debitoAutomatico.categoria_gasto_id,
        importancia_gasto_id: debitoAutomatico.importancia_gasto_id,
        frecuencia_gasto_id: debitoAutomatico.frecuencia_gasto_id,
        tipo_pago_id: debitoAutomatico.tipo_pago_id,
        tarjeta_id: debitoAutomatico.tarjeta_id,
        tipo_origen: 'debito_automatico',
        id_origen: debitoAutomatico.id
      }, { transaction });

      // Actualizar último mes y año de generación
      await debitoAutomatico.update({
        ultimo_mes_generado: mesActual,
        ultimo_anio_generado: anioActual
      }, { transaction });

      await transaction.commit();
      logger.info('Gasto generado desde débito automático:', { 
        id: gasto.id, 
        origen_id: debitoAutomatico.id,
        dia_efectivo_pago: diaEfectivoPago,
        mes: mesActual,
        anio: anioActual
      });
      return gasto;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error al generar gasto desde débito automático:', { error, debitoAutomatico_id: debitoAutomatico.id });
      throw error;
    }
  }

  static async generatePendingExpenses() {
    const results = {
      success: [],
      errors: []
    };

    try {
      // Procesar gastos recurrentes activos
      const gastosRecurrentes = await GastoRecurrente.findAll({
        where: { activo: true },
        include: [
          { model: CategoriaGasto, as: 'categoria' },
          { model: ImportanciaGasto, as: 'importancia' },
          { model: TipoPago, as: 'tipoPago' },
          { model: Tarjeta, as: 'tarjeta' },
          { model: FrecuenciaGasto, as: 'frecuencia' }
        ]
      });

      for (const gastoRecurrente of gastosRecurrentes) {
        try {
          const gasto = await this.generateFromGastoRecurrente(gastoRecurrente);
          if (gasto) results.success.push({ type: 'recurrente', id: gasto.id });
        } catch (error) {
          results.errors.push({ type: 'recurrente', id: gastoRecurrente.id, error: error.message });
        }
      }

      // Procesar débitos automáticos activos
      const debitosAutomaticos = await DebitoAutomatico.findAll({
        where: { activo: true },
        include: [
          { model: CategoriaGasto, as: 'categoria' },
          { model: ImportanciaGasto, as: 'importancia' },
          { model: TipoPago, as: 'tipoPago' },
          { model: Tarjeta, as: 'tarjeta' },
          { model: FrecuenciaGasto, as: 'frecuencia' }
        ]
      });

      for (const debitoAutomatico of debitosAutomaticos) {
        try {
          const gasto = await this.generateFromDebitoAutomatico(debitoAutomatico);
          if (gasto) results.success.push({ type: 'debito', id: gasto.id });
        } catch (error) {
          results.errors.push({ type: 'debito', id: debitoAutomatico.id, error: error.message });
        }
      }

      // Procesar solo compras pendientes de cuotas
      const compras = await Compra.findAll({
        where: {
          pendiente_cuotas: true,
          cantidad_cuotas: {
            [Op.gt]: 1
          }
        },
        include: [
          { model: CategoriaGasto, as: 'categoria' },
          { model: ImportanciaGasto, as: 'importancia' },
          { model: TipoPago, as: 'tipoPago' },
          { model: Tarjeta, as: 'tarjeta' }
        ]
      });

      for (const compra of compras) {
        try {
          const gasto = await this.generateFromCompra(compra);
          if (gasto) results.success.push({ type: 'compra', id: gasto.id });
        } catch (error) {
          results.errors.push({ type: 'compra', id: compra.id, error: error.message });
        }
      }

      // Procesar gastos únicos pendientes
      const gastosUnicos = await GastoUnico.findAll({
        where: { procesado: false }, // Nuevo campo para tracking
        include: [
          { model: CategoriaGasto, as: 'categoria' },
          { model: ImportanciaGasto, as: 'importancia' },
          { model: TipoPago, as: 'tipoPago' },
          { model: Tarjeta, as: 'tarjeta' }
        ]
      });

      for (const gastoUnico of gastosUnicos) {
        try {
          const gasto = await this.generateFromGastoUnico(gastoUnico);
          if (gasto) {
            results.success.push({ type: 'unico', id: gasto.id });
          }
        } catch (error) {
          results.errors.push({ type: 'unico', id: gastoUnico.id, error: error.message });
        }
      }

      logger.info('Generación automática de gastos completada', { results });
      return results;
    } catch (error) {
      logger.error('Error en la generación automática de gastos:', { error });
      throw error;
    }
  }
} 