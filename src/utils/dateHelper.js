import moment from 'moment-timezone';

const TZ = 'America/Argentina/Buenos_Aires';

/**
 * Devuelve la fecha de hoy en timezone Argentina.
 * Se usa como default de fecha_inicio cuando el usuario no la especifica.
 *
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function getDefaultFechaInicio() {
  return moment().tz(TZ).format('YYYY-MM-DD');
}

/**
 * Calcula la fecha_inicio para que el scheduler genere el gasto del mes actual.
 * Setea fecha_inicio al dia_de_pago del mes actual, para que el catch-up lo detecte.
 *
 * - Si dia_de_pago no existe en el mes (ej: 31 en febrero), usa el último día del mes
 *
 * @param {number} diaDePago - Día del mes (1-31)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function getFechaInicioForCurrentMonth(diaDePago) {
  const today = moment().tz(TZ);
  const daysInMonth = today.daysInMonth();
  const effectiveDay = Math.min(diaDePago, daysInMonth);
  return today.clone().date(effectiveDay).format('YYYY-MM-DD');
}
