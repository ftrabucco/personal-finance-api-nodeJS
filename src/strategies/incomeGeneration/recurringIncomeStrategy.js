import { IngresoUnico } from '../../models/index.js';
import ExchangeRateService from '../../services/exchangeRate.service.js';
import logger from '../../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Generates dated IngresoUnico occurrences from an IngresoRecurrente,
 * snapshotting each occurrence's exchange rate as of its own date instead
 * of reusing today's rate — this is the fix for the bug described in
 * docs/architecture/known-issues.md ("Ingresos recurrentes en USD...").
 *
 * Mirrors the gasto generation strategies in spirit (one row per due
 * occurrence, idempotent via a unique index, `ultima_fecha_generado`
 * tracking), but isn't an expense strategy, so it doesn't extend
 * BaseExpenseGenerationStrategy. Only one income strategy exists today —
 * no shared base class until a second one needs it.
 */
export class RecurringIncomeStrategy {
  getType() {
    return 'recurrente';
  }

  /**
   * Generate today's occurrence only — used by the scheduled (non-catch-up)
   * path and by shouldGenerateIncome's adjustedDate when it's today.
   */
  async generate(ingresoRecurrente, transaction = null) {
    const today = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
    return this.generateWithDate(ingresoRecurrente, today, transaction);
  }

  /**
   * Generate (or skip, if it already exists) one occurrence dated
   * `targetDate`, with monto_ars/monto_usd/tipo_cambio_usado snapshotted
   * from that date's historical rate via ExchangeRateService.getRateForDate
   * — not `ingresoRecurrente.tipo_cambio_referencia`, which is today's rate
   * and would be wrong for a backfilled past month.
   */
  async generateWithDate(ingresoRecurrente, targetDate, transaction = null) {
    const existing = await IngresoUnico.findOne({
      where: {
        ingreso_recurrente_id: ingresoRecurrente.id,
        fecha: targetDate
      },
      transaction
    });

    if (existing) {
      logger.warn('Recurring income occurrence already exists for this date - skipping duplicate', {
        source_id: ingresoRecurrente.id,
        existing_id: existing.id,
        target_date: targetDate
      });
      await this.updateLastGeneratedDate(ingresoRecurrente, targetDate, transaction);
      return null;
    }

    const monedaOrigen = ingresoRecurrente.moneda_origen || 'ARS';
    const tipoCambio = await ExchangeRateService.getRateForDate(targetDate);
    const { monto_ars, monto_usd, tipo_cambio_usado } =
      await ExchangeRateService.calculateBothCurrencies(ingresoRecurrente.monto, monedaOrigen, tipoCambio);

    const ingresoUnico = await IngresoUnico.create({
      descripcion: ingresoRecurrente.descripcion,
      monto: ingresoRecurrente.monto,
      fecha: targetDate,
      fuente_ingreso_id: ingresoRecurrente.fuente_ingreso_id,
      usuario_id: ingresoRecurrente.usuario_id,
      moneda_origen: monedaOrigen,
      monto_ars,
      monto_usd,
      tipo_cambio_usado,
      ingreso_recurrente_id: ingresoRecurrente.id
    }, { transaction });

    await this.updateLastGeneratedDate(ingresoRecurrente, targetDate, transaction);

    logger.info('Recurring income occurrence generated', {
      ingresoUnico_id: ingresoUnico.id,
      source_id: ingresoRecurrente.id,
      fecha: targetDate,
      monto_ars,
      monto_usd,
      tipo_cambio_usado
    });

    return ingresoUnico;
  }

  /**
   * Backfills every missed monthly occurrence from the source's last
   * generation (or fecha_inicio) through today, each snapshotted with that
   * month's own historical rate.
   *
   * Scoped to `frecuencia = 'mensual'` on purpose: that's the motivating
   * case (a monthly salary), and generic multi-period catch-up for every
   * frequency (quincenal/semanal/diario/bimestral/trimestral/semestral/
   * anual) is a lot of untested stepping logic for frequencies that don't
   * plausibly apply to a recurring income. For any other frequency, this
   * just generates the current due occurrence — same as `generate()` —
   * rather than attempting a multi-period backfill.
   */
  async generateCatchUp(ingresoRecurrente, transaction = null) {
    const frecuenciaNombre = ingresoRecurrente.frecuencia?.nombre_frecuencia?.toLowerCase();

    if (frecuenciaNombre !== 'mensual' || !ingresoRecurrente.fecha_inicio) {
      return [await this.generate(ingresoRecurrente, transaction)].filter(Boolean);
    }

    const today = moment().tz('America/Argentina/Buenos_Aires');
    const fechaFin = ingresoRecurrente.fecha_fin ? moment(ingresoRecurrente.fecha_fin) : null;

    const startBasis = ingresoRecurrente.ultima_fecha_generado
      ? moment(ingresoRecurrente.ultima_fecha_generado).startOf('month')
      : moment(ingresoRecurrente.fecha_inicio).startOf('month').subtract(1, 'month');

    const generated = [];
    let cursor = startBasis.clone();

    for (;;) {
      cursor = cursor.clone().add(1, 'month');
      const occurrence = this.clampToValidDay(cursor, ingresoRecurrente.dia_de_pago);

      if (occurrence.isAfter(today, 'day')) break;
      if (fechaFin && occurrence.isAfter(fechaFin, 'day')) break;

      const row = await this.generateWithDate(ingresoRecurrente, occurrence.format('YYYY-MM-DD'), transaction);
      if (row) generated.push(row);
    }

    logger.info('Recurring income catch-up completed', {
      source_id: ingresoRecurrente.id,
      occurrences_generated: generated.length
    });

    return generated;
  }

  /** Clamps `dia_de_pago` to the last valid day of `monthMoment`'s month (e.g. day 31 in a 30-day month). */
  clampToValidDay(monthMoment, day) {
    const daysInMonth = monthMoment.daysInMonth();
    return monthMoment.clone().date(Math.min(day, daysInMonth));
  }

  async updateLastGeneratedDate(ingresoRecurrente, fechaParaBD, transaction) {
    await ingresoRecurrente.update({ ultima_fecha_generado: fechaParaBD }, { transaction });
  }
}
