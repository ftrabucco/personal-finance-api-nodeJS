import { Gasto, CategoriaGasto, ImportanciaGasto, TipoPago } from '../models/index.js';
import { Op } from 'sequelize';
import moment from 'moment-timezone';
import logger from '../utils/logger.js';

/**
 * Service for calculating financial health score
 * Analyzes spending patterns and provides a score from 0-100
 */
export class SaludFinancieraService {
  static TIMEZONE = 'America/Argentina/Buenos_Aires';

  // Default weights for scoring factors (total = 100)
  static DEFAULT_WEIGHTS = {
    ratio_esenciales: 40,      // Necessary vs non-necessary spending
    gastos_evitables: 30,      // "Prescindible" expenses penalty
    tendencia: 20,             // Month-over-month trend
    diversificacion: 10        // Category concentration
  };

  // Rating thresholds
  static RATINGS = [
    { min: 90, label: 'Excelente' },
    { min: 75, label: 'Muy Buena' },
    { min: 60, label: 'Buena' },
    { min: 45, label: 'Regular' },
    { min: 30, label: 'Mejorable' },
    { min: 0, label: 'Crítica' }
  ];

  // Importance levels for categorization (3 levels: Necesario, Deseado, Prescindible)
  static ESSENTIAL_IMPORTANCES = ['Necesario'];
  static AVOIDABLE_IMPORTANCES = ['Prescindible'];
  static WORST_IMPORTANCE = 'Prescindible';

  /**
   * Calculate financial health score for a user
   * @param {number} userId - User ID
   * @param {string} periodo - Period to analyze: 'semana', 'mes', 'trimestre', 'anio'
   * @returns {Object} Health score with breakdown and recommendations
   */
  static async calculateHealthScore(userId, periodo = 'mes') {
    const { desde, hasta } = this.getPeriodDates(periodo);
    const today = moment().tz(this.TIMEZONE);

    logger.debug('Calculating financial health score', {
      userId,
      periodo,
      desde: desde.format('YYYY-MM-DD'),
      hasta: hasta.format('YYYY-MM-DD')
    });

    // Get expenses for the period
    const gastos = await this.getGastosForPeriod(userId, desde, hasta);

    // If no expenses, return neutral score
    if (gastos.length === 0) {
      return {
        score: 50,
        calificacion: 'Regular',
        mensaje: 'No hay gastos registrados en este período para analizar',
        periodo: {
          tipo: periodo,
          desde: desde.format('YYYY-MM-DD'),
          hasta: hasta.format('YYYY-MM-DD')
        },
        desglose: null,
        recomendaciones: ['Registra tus gastos para obtener un análisis de salud financiera']
      };
    }

    // Calculate totals
    const totalArs = gastos.reduce((sum, g) => sum + (parseFloat(g.monto_ars) || 0), 0);

    // Aggregate by importance and category
    const gastosByImportancia = this.aggregateByImportancia(gastos);
    const gastosByCategoria = this.aggregateByCategoria(gastos);
    const gastosByTipoPago = this.aggregateByTipoPago(gastos);

    // Calculate each scoring factor
    const weights = this.DEFAULT_WEIGHTS;

    const ratioEsenciales = this.calculateEssentialRatio(gastosByImportancia, totalArs, weights.ratio_esenciales);
    const gastosEvitables = this.calculateAvoidableExpenses(gastosByImportancia, totalArs, weights.gastos_evitables);
    const tendencia = await this.calculateTrend(userId, desde, weights.tendencia);
    const diversificacion = this.calculateDiversification(gastosByCategoria, totalArs, weights.diversificacion);

    // Calculate total score
    const score = Math.round(
      ratioEsenciales.puntos +
      gastosEvitables.puntos +
      tendencia.puntos +
      diversificacion.puntos
    );

    // Get rating label
    const calificacion = this.getRating(score);

    // Generate recommendations
    const recomendaciones = this.generateRecommendations(
      { ratioEsenciales, gastosEvitables, tendencia, diversificacion },
      gastosByCategoria,
      gastosByImportancia
    );

    logger.info('Financial health score calculated', {
      userId,
      periodo,
      score,
      calificacion
    });

    return {
      score,
      calificacion,
      periodo: {
        tipo: periodo,
        desde: desde.format('YYYY-MM-DD'),
        hasta: hasta.format('YYYY-MM-DD')
      },
      totales: {
        total_ars: Math.round(totalArs * 100) / 100,
        cantidad_gastos: gastos.length
      },
      desglose: {
        ratio_esenciales: ratioEsenciales,
        gastos_evitables: gastosEvitables,
        tendencia,
        diversificacion
      },
      distribucion: {
        por_importancia: gastosByImportancia,
        por_categoria: gastosByCategoria,
        por_tipo_pago: gastosByTipoPago
      },
      recomendaciones
    };
  }

  /**
   * Get period date range based on period type
   */
  static getPeriodDates(periodo) {
    const today = moment().tz(this.TIMEZONE);
    let desde, hasta;

    switch (periodo) {
    case 'semana':
      desde = today.clone().startOf('week');
      hasta = today.clone().endOf('week');
      break;
    case 'mes':
      desde = today.clone().startOf('month');
      hasta = today.clone().endOf('month');
      break;
    case 'trimestre':
      desde = today.clone().startOf('quarter');
      hasta = today.clone().endOf('quarter');
      break;
    case 'anio':
      desde = today.clone().startOf('year');
      hasta = today.clone().endOf('year');
      break;
    default:
      desde = today.clone().startOf('month');
      hasta = today.clone().endOf('month');
    }

    return { desde, hasta };
  }

  /**
   * Get expenses for a period
   */
  static async getGastosForPeriod(userId, desde, hasta) {
    return Gasto.findAll({
      where: {
        usuario_id: userId,
        fecha: {
          [Op.between]: [desde.format('YYYY-MM-DD'), hasta.format('YYYY-MM-DD')]
        }
      },
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' }
      ]
    });
  }

  /**
   * Aggregate expenses by importance level
   */
  static aggregateByImportancia(gastos) {
    const result = {};

    gastos.forEach(gasto => {
      const key = gasto.importancia?.nombre_importancia || 'Sin importancia';
      if (!result[key]) {
        result[key] = { total_ars: 0, cantidad: 0 };
      }
      result[key].total_ars += parseFloat(gasto.monto_ars) || 0;
      result[key].cantidad++;
    });

    // Round values
    Object.keys(result).forEach(key => {
      result[key].total_ars = Math.round(result[key].total_ars * 100) / 100;
    });

    return result;
  }

  /**
   * Aggregate expenses by category
   */
  static aggregateByCategoria(gastos) {
    const result = {};

    gastos.forEach(gasto => {
      const key = gasto.categoria?.nombre_categoria || 'Sin categoría';
      if (!result[key]) {
        result[key] = { total_ars: 0, cantidad: 0 };
      }
      result[key].total_ars += parseFloat(gasto.monto_ars) || 0;
      result[key].cantidad++;
    });

    // Round values
    Object.keys(result).forEach(key => {
      result[key].total_ars = Math.round(result[key].total_ars * 100) / 100;
    });

    return result;
  }

  /**
   * Aggregate expenses by payment type
   */
  static aggregateByTipoPago(gastos) {
    const result = {};

    gastos.forEach(gasto => {
      const key = gasto.tipoPago?.nombre || 'Sin tipo de pago';
      if (!result[key]) {
        result[key] = { total_ars: 0, cantidad: 0 };
      }
      result[key].total_ars += parseFloat(gasto.monto_ars) || 0;
      result[key].cantidad++;
    });

    // Round values
    Object.keys(result).forEach(key => {
      result[key].total_ars = Math.round(result[key].total_ars * 100) / 100;
    });

    return result;
  }

  /**
   * Calculate essential expenses ratio score
   * Higher essential % = better score
   */
  static calculateEssentialRatio(gastosByImportancia, totalArs, weight) {
    if (totalArs === 0) {
      return { valor: 0, peso: weight, puntos: weight / 2 };
    }

    // Sum necessary expenses (Necesario)
    let essentialTotal = 0;
    this.ESSENTIAL_IMPORTANCES.forEach(imp => {
      essentialTotal += gastosByImportancia[imp]?.total_ars || 0;
    });

    const ratio = (essentialTotal / totalArs) * 100;

    // Score: 0-100% ratio maps to 0-weight points
    // Ideal: 70%+ essential = full points
    // Below 50% essential = low score
    let scorePercent;
    if (ratio >= 70) {
      scorePercent = 1;
    } else if (ratio >= 50) {
      scorePercent = 0.7 + ((ratio - 50) / 20) * 0.3;
    } else {
      scorePercent = ratio / 50 * 0.7;
    }

    const puntos = Math.round(weight * scorePercent * 10) / 10;

    return {
      valor: Math.round(ratio * 10) / 10,
      descripcion: `${Math.round(ratio)}% de gastos son necesarios`,
      peso: weight,
      puntos
    };
  }

  /**
   * Calculate avoidable expenses penalty
   * Lower "Prescindible" % = better score
   */
  static calculateAvoidableExpenses(gastosByImportancia, totalArs, weight) {
    if (totalArs === 0) {
      return { valor: 0, peso: weight, puntos: weight };
    }

    // Get "Prescindible" expenses
    const prescindibleTotal = gastosByImportancia[this.WORST_IMPORTANCE]?.total_ars || 0;
    const ratio = (prescindibleTotal / totalArs) * 100;

    // Score: 0% "Prescindible" = full points
    // >10% = heavy penalty
    let scorePercent;
    if (ratio === 0) {
      scorePercent = 1;
    } else if (ratio <= 5) {
      scorePercent = 0.85 + ((5 - ratio) / 5) * 0.15;
    } else if (ratio <= 10) {
      scorePercent = 0.6 + ((10 - ratio) / 5) * 0.25;
    } else {
      // Heavy penalty for >10%
      scorePercent = Math.max(0, 0.6 - (ratio - 10) / 20);
    }

    const puntos = Math.round(weight * scorePercent * 10) / 10;

    return {
      valor: Math.round(ratio * 10) / 10,
      descripcion: ratio === 0 ?
        'Sin gastos prescindibles' :
        `${Math.round(ratio)}% de gastos son prescindibles`,
      peso: weight,
      puntos
    };
  }

  /**
   * Calculate month-over-month trend score
   * Decreased spending = better score
   */
  static async calculateTrend(userId, currentPeriodStart, weight) {
    // Get previous month's expenses
    const previousStart = currentPeriodStart.clone().subtract(1, 'month').startOf('month');
    const previousEnd = previousStart.clone().endOf('month');
    const currentEnd = currentPeriodStart.clone().endOf('month');

    const [previousGastos, currentGastos] = await Promise.all([
      this.getGastosForPeriod(userId, previousStart, previousEnd),
      this.getGastosForPeriod(userId, currentPeriodStart, currentEnd)
    ]);

    const previousTotal = previousGastos.reduce((sum, g) => sum + (parseFloat(g.monto_ars) || 0), 0);
    const currentTotal = currentGastos.reduce((sum, g) => sum + (parseFloat(g.monto_ars) || 0), 0);

    // If no previous data, neutral score
    if (previousTotal === 0) {
      return {
        valor: 0,
        descripcion: 'Sin datos del período anterior para comparar',
        peso: weight,
        puntos: Math.round(weight / 2 * 10) / 10
      };
    }

    const changePercent = ((currentTotal - previousTotal) / previousTotal) * 100;

    // Score: Decreased = good, Increased = bad
    let scorePercent;
    let descripcion;

    if (changePercent <= -10) {
      scorePercent = 1;
      descripcion = `Gastos disminuyeron ${Math.abs(Math.round(changePercent))}%`;
    } else if (changePercent <= 0) {
      scorePercent = 0.75 + (Math.abs(changePercent) / 10) * 0.25;
      descripcion = `Gastos disminuyeron ${Math.abs(Math.round(changePercent))}%`;
    } else if (changePercent <= 5) {
      scorePercent = 0.5 + ((5 - changePercent) / 5) * 0.25;
      descripcion = `Gastos aumentaron ${Math.round(changePercent)}%`;
    } else if (changePercent <= 15) {
      scorePercent = 0.25 + ((15 - changePercent) / 10) * 0.25;
      descripcion = `Gastos aumentaron ${Math.round(changePercent)}%`;
    } else {
      scorePercent = Math.max(0, 0.25 - (changePercent - 15) / 40);
      descripcion = `Gastos aumentaron ${Math.round(changePercent)}%`;
    }

    const puntos = Math.round(weight * scorePercent * 10) / 10;

    return {
      valor: Math.round(changePercent * 10) / 10,
      descripcion,
      peso: weight,
      puntos
    };
  }

  /**
   * Calculate category diversification score
   * Lower concentration in single category = better score
   */
  static calculateDiversification(gastosByCategoria, totalArs, weight) {
    if (totalArs === 0) {
      return { valor: 0, peso: weight, puntos: weight / 2 };
    }

    const categories = Object.values(gastosByCategoria);
    if (categories.length === 0) {
      return { valor: 0, peso: weight, puntos: weight / 2 };
    }

    // Find top category percentage
    const topCategoryTotal = Math.max(...categories.map(c => c.total_ars));
    const topCategoryPercent = (topCategoryTotal / totalArs) * 100;

    // Score: Lower concentration = better
    let scorePercent;
    let descripcion;

    if (topCategoryPercent <= 30) {
      scorePercent = 1;
      descripcion = 'Gastos bien diversificados';
    } else if (topCategoryPercent <= 50) {
      scorePercent = 0.7 + ((50 - topCategoryPercent) / 20) * 0.3;
      descripcion = 'Gastos moderadamente diversificados';
    } else if (topCategoryPercent <= 70) {
      scorePercent = 0.4 + ((70 - topCategoryPercent) / 20) * 0.3;
      descripcion = 'Gastos algo concentrados';
    } else {
      scorePercent = Math.max(0, 0.4 - (topCategoryPercent - 70) / 75);
      descripcion = 'Gastos muy concentrados en una categoría';
    }

    const puntos = Math.round(weight * scorePercent * 10) / 10;

    return {
      valor: Math.round(topCategoryPercent * 10) / 10,
      descripcion,
      peso: weight,
      puntos,
      cantidad_categorias: Object.keys(gastosByCategoria).length
    };
  }

  /**
   * Get rating label from score
   */
  static getRating(score) {
    for (const rating of this.RATINGS) {
      if (score >= rating.min) {
        return rating.label;
      }
    }
    return 'Crítica';
  }

  /**
   * Generate context-aware recommendations
   */
  static generateRecommendations(desglose, gastosByCategoria, gastosByImportancia) {
    const recommendations = [];

    // Check essential ratio
    if (desglose.ratioEsenciales.valor < 50) {
      recommendations.push('Considerá priorizar gastos esenciales sobre gastos discrecionales');
    }

    // Check "Prescindible" expenses
    const prescindibleTotal = gastosByImportancia[this.WORST_IMPORTANCE]?.total_ars || 0;
    if (prescindibleTotal > 0) {
      recommendations.push('Reducir gastos prescindibles mejoraría significativamente tu puntaje');
    }

    // Check trend
    if (desglose.tendencia.valor > 10) {
      recommendations.push('Los gastos aumentaron respecto al mes anterior - revisá compras recientes');
    } else if (desglose.tendencia.valor < -5) {
      recommendations.push('Excelente - mantené el control de gastos que venís logrando');
    }

    // Check diversification
    if (desglose.diversificacion.valor > 50) {
      // Find top category
      const topCategory = Object.entries(gastosByCategoria)
        .sort((a, b) => b[1].total_ars - a[1].total_ars)[0];

      if (topCategory) {
        recommendations.push(`Gastos concentrados en "${topCategory[0]}" - considerá distribuir mejor tu presupuesto`);
      }
    }

    // Check avoidable expenses
    let avoidableTotal = 0;
    this.AVOIDABLE_IMPORTANCES.forEach(imp => {
      avoidableTotal += gastosByImportancia[imp]?.total_ars || 0;
    });

    if (avoidableTotal > 0 && recommendations.length < 3) {
      recommendations.push('Revisá gastos prescindibles para identificar posibles ahorros');
    }

    // Default positive recommendation if score is good
    if (recommendations.length === 0) {
      recommendations.push('Tu salud financiera es buena - seguí así');
    }

    return recommendations;
  }
}
