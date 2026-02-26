import { GastoRecurrente, DebitoAutomatico, Compra, Gasto, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../models/index.js';
import moment from 'moment-timezone';
import logger from '../utils/logger.js';

/**
 * Service for projecting future expenses
 * Projects recurring expenses, automatic debits, and pending installments
 */
export class ProyeccionService {
  static TIMEZONE = 'America/Argentina/Buenos_Aires';

  /**
   * Project expenses N months into the future
   * @param {number} userId - User ID
   * @param {number} monthsAhead - Number of months to project (1-12)
   * @returns {Object} Projection data with monthly breakdown and summary
   */
  static async projectExpenses(userId, monthsAhead = 3) {
    const today = moment().tz(this.TIMEZONE);
    const proyeccion = [];
    let totalArs = 0;
    let totalUsd = 0;

    logger.debug('Starting expense projection', {
      userId,
      monthsAhead,
      startDate: today.format('YYYY-MM-DD')
    });

    // Fetch all active sources
    const [gastosRecurrentes, debitosAutomaticos, compras] = await Promise.all([
      this.getActiveGastosRecurrentes(userId),
      this.getActiveDebitosAutomaticos(userId),
      this.getPendingCompras(userId)
    ]);

    // Project each month
    for (let monthOffset = 1; monthOffset <= monthsAhead; monthOffset++) {
      const targetMonth = today.clone().add(monthOffset, 'months');
      const mesKey = targetMonth.format('YYYY-MM');

      const monthlyExpenses = [];
      let monthTotalArs = 0;
      let monthTotalUsd = 0;

      // Project gastos recurrentes
      for (const gasto of gastosRecurrentes) {
        const projected = this.projectGastoRecurrente(gasto, targetMonth);
        for (const expense of projected) {
          monthlyExpenses.push(expense);
          monthTotalArs += expense.monto_ars || 0;
          monthTotalUsd += expense.monto_usd || 0;
        }
      }

      // Project debitos automaticos
      for (const debito of debitosAutomaticos) {
        const projected = this.projectDebitoAutomatico(debito, targetMonth);
        for (const expense of projected) {
          monthlyExpenses.push(expense);
          monthTotalArs += expense.monto_ars || 0;
          monthTotalUsd += expense.monto_usd || 0;
        }
      }

      // Project compras (installments)
      for (const compra of compras) {
        const projected = await this.projectCompra(compra, targetMonth, today);
        if (projected) {
          monthlyExpenses.push(projected);
          monthTotalArs += projected.monto_ars || 0;
          monthTotalUsd += projected.monto_usd || 0;
        }
      }

      proyeccion.push({
        mes: mesKey,
        total_ars: Math.round(monthTotalArs * 100) / 100,
        total_usd: Math.round(monthTotalUsd * 100) / 100,
        cantidad_gastos: monthlyExpenses.length,
        gastos: monthlyExpenses.sort((a, b) => {
          const dateA = moment(a.fecha_proyectada);
          const dateB = moment(b.fecha_proyectada);
          return dateA.diff(dateB);
        })
      });

      totalArs += monthTotalArs;
      totalUsd += monthTotalUsd;
    }

    logger.info('Expense projection completed', {
      userId,
      monthsAhead,
      totalArs,
      totalUsd,
      totalExpenses: proyeccion.reduce((sum, m) => sum + m.cantidad_gastos, 0)
    });

    return {
      proyeccion,
      resumen: {
        total_ars: Math.round(totalArs * 100) / 100,
        total_usd: Math.round(totalUsd * 100) / 100,
        meses_proyectados: monthsAhead,
        promedio_mensual_ars: Math.round((totalArs / monthsAhead) * 100) / 100,
        promedio_mensual_usd: Math.round((totalUsd / monthsAhead) * 100) / 100
      }
    };
  }

  /**
   * Get active recurring expenses for a user
   */
  static async getActiveGastosRecurrentes(userId) {
    return GastoRecurrente.findAll({
      where: { usuario_id: userId, activo: true },
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });
  }

  /**
   * Get active automatic debits for a user
   */
  static async getActiveDebitosAutomaticos(userId) {
    return DebitoAutomatico.findAll({
      where: { usuario_id: userId, activo: true },
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });
  }

  /**
   * Get pending installment purchases for a user
   */
  static async getPendingCompras(userId) {
    return Compra.findAll({
      where: { usuario_id: userId, pendiente_cuotas: true },
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: Tarjeta, as: 'tarjeta' }
      ]
    });
  }

  /**
   * Project a recurring expense for a target month
   * @returns {Array} Array of projected expenses (can be multiple for daily/weekly)
   */
  static projectGastoRecurrente(gasto, targetMonth) {
    const frecuencia = gasto.frecuencia?.nombre_frecuencia?.toLowerCase();
    if (!frecuencia || frecuencia === 'único' || frecuencia === 'unico') {
      return [];
    }

    // Check fecha_inicio constraint
    if (gasto.fecha_inicio) {
      const fechaInicio = moment(gasto.fecha_inicio);
      if (targetMonth.endOf('month').isBefore(fechaInicio, 'day')) {
        return []; // Target month ends before start date
      }
    }

    const willGenerate = this.willGenerateInMonth(gasto, frecuencia, targetMonth);
    if (!willGenerate.generates) {
      return [];
    }

    return willGenerate.dates.map(date => ({
      tipo: 'recurrente',
      id_origen: gasto.id,
      descripcion: gasto.descripcion,
      monto_ars: parseFloat(gasto.monto_ars) || 0,
      monto_usd: parseFloat(gasto.monto_usd) || 0,
      fecha_proyectada: date,
      categoria: gasto.categoria?.nombre_categoria || 'Sin categoría',
      importancia: gasto.importancia?.nombre_importancia || 'Sin importancia',
      frecuencia: gasto.frecuencia?.nombre_frecuencia || frecuencia
    }));
  }

  /**
   * Project an automatic debit for a target month
   * @returns {Array} Array of projected expenses
   */
  static projectDebitoAutomatico(debito, targetMonth) {
    const frecuencia = debito.frecuencia?.nombre_frecuencia?.toLowerCase();
    if (!frecuencia || frecuencia === 'único' || frecuencia === 'unico') {
      return [];
    }

    // Check fecha_inicio constraint
    if (debito.fecha_inicio) {
      const fechaInicio = moment(debito.fecha_inicio);
      if (targetMonth.endOf('month').isBefore(fechaInicio, 'day')) {
        return [];
      }
    }

    // Check fecha_fin constraint (debitos can have end date)
    if (debito.fecha_fin) {
      const fechaFin = moment(debito.fecha_fin);
      if (targetMonth.startOf('month').isAfter(fechaFin, 'day')) {
        return [];
      }
    }

    const willGenerate = this.willGenerateInMonth(debito, frecuencia, targetMonth);
    if (!willGenerate.generates) {
      return [];
    }

    return willGenerate.dates.map(date => ({
      tipo: 'debito_automatico',
      id_origen: debito.id,
      descripcion: debito.descripcion,
      monto_ars: parseFloat(debito.monto_ars) || 0,
      monto_usd: parseFloat(debito.monto_usd) || 0,
      fecha_proyectada: date,
      categoria: debito.categoria?.nombre_categoria || 'Sin categoría',
      importancia: debito.importancia?.nombre_importancia || 'Sin importancia',
      frecuencia: debito.frecuencia?.nombre_frecuencia || frecuencia
    }));
  }

  /**
   * Project an installment purchase for a target month
   * @returns {Object|null} Projected expense or null
   */
  static async projectCompra(compra, targetMonth, today) {
    // Count already generated installments
    const generatedCount = await Gasto.count({
      where: {
        tipo_origen: 'compra',
        id_origen: compra.id
      }
    });

    const remainingCuotas = compra.cantidad_cuotas - generatedCount;
    if (remainingCuotas <= 0) {
      return null;
    }

    // Calculate which installment number would be generated in target month
    const fechaCompra = moment(compra.fecha_compra);
    const monthsSincePurchase = targetMonth.diff(fechaCompra, 'months');

    // If target month is before purchase month, no installment
    if (monthsSincePurchase < 0) {
      return null;
    }

    // Calculate which cuota number this would be
    // First cuota is based on credit card billing cycle or purchase date
    let cuotaNumber;
    if (compra.tarjeta?.tipo === 'credito' && compra.tarjeta?.dia_mes_cierre && compra.tarjeta?.dia_mes_vencimiento) {
      // For credit cards, calculate based on billing cycle:
      // - Purchase before/on closing date: pays in the FOLLOWING month (vencimiento is next month)
      // - Purchase after closing date: pays TWO months later
      const diaCompra = fechaCompra.date();
      const diaCierre = compra.tarjeta.dia_mes_cierre;

      // The payment (vencimiento) is always in the month AFTER the closing
      // So if purchase is before closing, it enters current cycle → pays next month
      // If purchase is after closing, it enters next cycle → pays month after next
      let firstPaymentMonth;
      if (diaCompra <= diaCierre) {
        // Compra antes o en el cierre: paga el mes siguiente
        firstPaymentMonth = fechaCompra.clone().add(1, 'month');
      } else {
        // Compra después del cierre: paga 2 meses después
        firstPaymentMonth = fechaCompra.clone().add(2, 'months');
      }

      cuotaNumber = targetMonth.diff(firstPaymentMonth, 'months') + 1;
    } else {
      cuotaNumber = monthsSincePurchase + 1;
    }

    // Check if this cuota is within range
    if (cuotaNumber < 1 || cuotaNumber > compra.cantidad_cuotas) {
      return null;
    }

    // Check if this cuota hasn't been generated yet
    if (cuotaNumber <= generatedCount) {
      return null;
    }

    // Calculate installment amount
    const montoTotalArs = parseFloat(compra.monto_total_ars) || 0;
    const montoTotalUsd = parseFloat(compra.monto_total_usd) || 0;
    const montoCuotaArs = montoTotalArs / compra.cantidad_cuotas;
    const montoCuotaUsd = montoTotalUsd / compra.cantidad_cuotas;

    // Determine payment date in target month
    let fechaProyectada;
    if (compra.tarjeta?.tipo === 'credito' && compra.tarjeta?.dia_mes_vencimiento) {
      fechaProyectada = this.getValidDayForMonth(targetMonth, compra.tarjeta.dia_mes_vencimiento);
    } else {
      fechaProyectada = this.getValidDayForMonth(targetMonth, fechaCompra.date());
    }

    return {
      tipo: 'compra',
      id_origen: compra.id,
      descripcion: `${compra.descripcion} (${cuotaNumber}/${compra.cantidad_cuotas})`,
      monto_ars: Math.round(montoCuotaArs * 100) / 100,
      monto_usd: Math.round(montoCuotaUsd * 100) / 100,
      fecha_proyectada: fechaProyectada,
      categoria: compra.categoria?.nombre_categoria || 'Sin categoría',
      importancia: compra.importancia?.nombre_importancia || 'Sin importancia',
      cuota_numero: cuotaNumber,
      cuotas_totales: compra.cantidad_cuotas
    };
  }

  /**
   * Check if an expense will generate in a given month based on frequency
   * @returns {Object} { generates: boolean, dates: string[] }
   */
  static willGenerateInMonth(expense, frecuencia, targetMonth) {
    const year = targetMonth.year();
    const month = targetMonth.month(); // 0-based
    const targetDay = expense.dia_de_pago;
    const targetMonthNumber = expense.mes_de_pago; // 1-based

    switch (frecuencia) {
    case 'diario': {
      // Generate every day of the month
      const daysInMonth = targetMonth.daysInMonth();
      const dates = [];
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(moment({ year, month, date: day }).format('YYYY-MM-DD'));
      }
      return { generates: true, dates };
    }

    case 'semanal': {
      // Generate ~4 times per month (every 7 days)
      const dates = [];
      const startOfMonth = moment({ year, month, date: 1 });
      const endOfMonth = startOfMonth.clone().endOf('month');

      // Find all days in this month that are 7 days apart
      // Use day of week from dia_de_pago or default to Monday
      const dayOfWeek = (targetDay - 1) % 7; // Convert to 0-6
      let current = startOfMonth.clone().day(dayOfWeek);
      if (current.isBefore(startOfMonth)) {
        current.add(7, 'days');
      }

      while (current.isSameOrBefore(endOfMonth)) {
        dates.push(current.format('YYYY-MM-DD'));
        current.add(7, 'days');
      }
      return { generates: dates.length > 0, dates };
    }

    case 'quincenal': {
      // Generate on 1st and 15th
      const dates = [];
      dates.push(moment({ year, month, date: 1 }).format('YYYY-MM-DD'));
      dates.push(moment({ year, month, date: 15 }).format('YYYY-MM-DD'));
      return { generates: true, dates };
    }

    case 'mensual': {
      const validDate = this.getValidDayForMonth(targetMonth, targetDay);
      return { generates: true, dates: [validDate] };
    }

    case 'bimestral': {
      // Every 2 months - check if this month is in sequence
      // Starting from month 1, generates on months 1, 3, 5, 7, 9, 11
      // Starting from month 2, generates on months 2, 4, 6, 8, 10, 12
      const monthNumber = targetMonth.month() + 1; // 1-12
      const startMonth = expense.fecha_inicio ?
        moment(expense.fecha_inicio).month() + 1 :
        1;

      // Check if months since start is divisible by 2
      const monthsSinceStart = monthNumber - startMonth;
      if (monthsSinceStart >= 0 && monthsSinceStart % 2 === 0) {
        const validDate = this.getValidDayForMonth(targetMonth, targetDay);
        return { generates: true, dates: [validDate] };
      }
      return { generates: false, dates: [] };
    }

    case 'trimestral': {
      // Every 3 months - months 1, 4, 7, 10 or based on start month
      const monthNumber = targetMonth.month() + 1;
      const quarterMonths = [1, 4, 7, 10];

      if (quarterMonths.includes(monthNumber)) {
        const validDate = this.getValidDayForMonth(targetMonth, targetDay);
        return { generates: true, dates: [validDate] };
      }
      return { generates: false, dates: [] };
    }

    case 'semestral': {
      // Every 6 months - months 1, 7 or based on mes_de_pago
      const monthNumber = targetMonth.month() + 1;
      const semesterMonths = [1, 7];

      if (semesterMonths.includes(monthNumber)) {
        const validDate = this.getValidDayForMonth(targetMonth, targetDay);
        return { generates: true, dates: [validDate] };
      }
      return { generates: false, dates: [] };
    }

    case 'anual': {
      // Once per year on specific month
      const monthNumber = targetMonth.month() + 1;

      if (targetMonthNumber && monthNumber === targetMonthNumber) {
        const validDate = this.getValidDayForMonth(targetMonth, targetDay);
        return { generates: true, dates: [validDate] };
      }
      return { generates: false, dates: [] };
    }

    default:
      return { generates: false, dates: [] };
    }
  }

  /**
   * Get a valid date for a month, handling edge cases like Feb 31
   */
  static getValidDayForMonth(targetMonth, targetDay) {
    const year = targetMonth.year();
    const month = targetMonth.month();

    // Create date with target day
    const targetDate = moment({ year, month, date: targetDay });

    // If the date is invalid (e.g., Feb 31), get last day of month
    if (!targetDate.isValid() || targetDate.date() !== targetDay) {
      return moment({ year, month }).endOf('month').format('YYYY-MM-DD');
    }

    return targetDate.format('YYYY-MM-DD');
  }
}
