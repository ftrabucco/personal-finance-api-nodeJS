import { Op } from 'sequelize';
import { GastoRecurrente, DebitoAutomatico, Compra, GastoUnico, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import logger from '../utils/logger.js';

export class GastoGeneratorService {
  static async generateFromGastoUnico(gastoUnico) {
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
      });

      logger.info('Gasto generado desde gasto único:', { id: gasto.id, origen_id: gastoUnico.id });
      return gasto;
    } catch (error) {
      logger.error('Error al generar gasto desde gasto único:', { error, gastoUnico_id: gastoUnico.id });
      throw error;
    }
  }

  static async generateFromCompra(compra) {
    try {
      // Validate that all required foreign keys exist
      const missingKeys = [];
      if (!compra.categoria_gasto_id) missingKeys.push('categoria_gasto_id');
      if (!compra.importancia_gasto_id) missingKeys.push('importancia_gasto_id');
      if (!compra.tipo_pago_id) missingKeys.push('tipo_pago_id');
      
      if (missingKeys.length > 0) {
        const error = new Error(`Missing required foreign keys: ${missingKeys.join(', ')}`);
        logger.error('Foreign key validation failed:', { 
          compra_id: compra.id,
          missing_keys: missingKeys,
          compra_data: compra.get({ plain: true })
        });
        throw error;
      }

      // Si la compra no tiene cuotas, tratarla como gasto único
      if (!compra.cantidad_cuotas || compra.cantidad_cuotas === 1) {
        const gasto = await Gasto.create({
          fecha: compra.fecha_compra,
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
        });

        // Marcar la compra como completada
        await compra.update({ pendiente_cuotas: false });

        logger.info('Gasto generado desde compra sin cuotas:', { id: gasto.id, origen_id: compra.id });
        return gasto;
      }

      // Verificar si ya existen gastos para esta compra
      const gastosExistentes = await Gasto.count({
        where: {
          tipo_origen: 'compra',
          id_origen: compra.id
        }
      });

      // Si ya se generaron todas las cuotas, marcar como completada y no hacer nada más
      if (gastosExistentes >= compra.cantidad_cuotas) {
        await compra.update({ pendiente_cuotas: false });
        logger.info('Todas las cuotas ya fueron generadas para la compra:', { compra_id: compra.id });
        return null;
      }

      // Calcular monto por cuota
      const montoPorCuota = compra.monto_total / compra.cantidad_cuotas;

      // Calcular fecha de la cuota
      const fechaCuota = new Date(compra.fecha_compra);
      fechaCuota.setMonth(fechaCuota.getMonth() + gastosExistentes);

      // Generar la siguiente cuota
      const gasto = await Gasto.create({
        fecha: fechaCuota,
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
      });

      // Si esta fue la última cuota, marcar como completada
      if (gastosExistentes + 1 >= compra.cantidad_cuotas) {
        await compra.update({ pendiente_cuotas: false });
      }

      logger.info('Gasto generado desde compra en cuotas:', { 
        id: gasto.id, 
        origen_id: compra.id,
        cuota: gastosExistentes + 1,
        total_cuotas: compra.cantidad_cuotas,
        fecha: fechaCuota
      });
      return gasto;
    } catch (error) {
      logger.error('Error al generar gasto desde compra:', { 
        error, 
        compra_id: compra.id,
        compra_data: compra.get({ plain: true })
      });
      throw error;
    }
  }

  static async generateFromGastoRecurrente(gastoRecurrente) {
    try {
      const today = new Date();
      const diaHoy = today.getDate();

      // Si no es el día de pago o ya se generó hoy, no hacer nada
      if (diaHoy !== gastoRecurrente.dia_de_pago || 
          (gastoRecurrente.ultima_fecha_generado && 
           gastoRecurrente.ultima_fecha_generado === today.toISOString().split('T')[0])) {
        return null;
      }

      const gasto = await Gasto.create({
        fecha: today,
        monto_ars: gastoRecurrente.monto,
        descripcion: gastoRecurrente.descripcion,
        categoria_gasto_id: gastoRecurrente.categoria_gasto_id,
        importancia_gasto_id: gastoRecurrente.importancia_gasto_id,
        frecuencia_gasto_id: gastoRecurrente.frecuencia_gasto_id,
        tipo_pago_id: gastoRecurrente.tipo_pago_id,
        tarjeta_id: gastoRecurrente.tarjeta_id,
        tipo_origen: 'recurrente',
        id_origen: gastoRecurrente.id
      });

      // Actualizar última fecha de generación
      await gastoRecurrente.update({
        ultima_fecha_generado: today
      });

      logger.info('Gasto generado desde gasto recurrente:', { id: gasto.id, origen_id: gastoRecurrente.id });
      return gasto;
    } catch (error) {
      logger.error('Error al generar gasto desde gasto recurrente:', { error, gastoRecurrente_id: gastoRecurrente.id });
      throw error;
    }
  }

  static async generateFromDebitoAutomatico(debitoAutomatico) {
    try {
      const today = new Date();
      const diaHoy = today.getDate();

      // Si no es el día de pago, no hacer nada
      if (diaHoy !== debitoAutomatico.dia_de_pago) {
        return null;
      }

      // Verificar si ya existe un gasto para este débito en el mes actual
      const primerDiaMes = new Date(today.getFullYear(), today.getMonth(), 1);
      const ultimoDiaMes = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const gastoExistente = await Gasto.findOne({
        where: {
          tipo_origen: 'debito',
          id_origen: debitoAutomatico.id,
          fecha: {
            [Op.between]: [primerDiaMes, ultimoDiaMes]
          }
        }
      });

      if (gastoExistente) {
        logger.info('Ya existe un gasto para este débito automático en el mes actual:', { debito_id: debitoAutomatico.id });
        return null;
      }

      const gasto = await Gasto.create({
        fecha: today,
        monto_ars: debitoAutomatico.monto,
        descripcion: debitoAutomatico.descripcion,
        categoria_gasto_id: debitoAutomatico.categoria_gasto_id,
        importancia_gasto_id: debitoAutomatico.importancia_gasto_id,
        frecuencia_gasto_id: debitoAutomatico.frecuencia_gasto_id,
        tipo_pago_id: debitoAutomatico.tipo_pago_id,
        tarjeta_id: debitoAutomatico.tarjeta_id,
        tipo_origen: 'debito',
        id_origen: debitoAutomatico.id
      });

      logger.info('Gasto generado desde débito automático:', { id: gasto.id, origen_id: debitoAutomatico.id });
      return gasto;
    } catch (error) {
      logger.error('Error al generar gasto desde débito automático:', { error, debitoAutomatico_id: debitoAutomatico.id });
      throw error;
    }
  }

  static async generateAllPendingGastos() {
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
            await gastoUnico.update({ procesado: true });
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