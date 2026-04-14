import { IngresoRecurrente } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';
import { getOrCreatePreferencias } from './preferenciasUsuario.service.js';

/**
 * Obtiene la evolución mensual del balance de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} desde - Mes inicio (YYYY-MM)
 * @param {string} hasta - Mes fin (YYYY-MM)
 * @returns {Promise<Object>} Evolución mensual con balance acumulado
 */
export async function getEvolucionMensual(usuarioId, desde, hasta) {
  const preferencias = await getOrCreatePreferencias(usuarioId);
  const balanceInicial = parseFloat(preferencias.balance_inicial) || 0;

  // Construir rango de fechas
  const fechaDesde = `${desde}-01`;
  const fechaHasta = getLastDayOfMonth(hasta);

  // Query 0: Calcular saldo acumulado PREVIO al rango solicitado
  // Esto asegura que el acumulado refleje toda la historia, no solo el rango
  const [saldoPrevio] = await sequelize.query(`
    SELECT
      COALESCE((SELECT SUM(monto_ars) FROM finanzas.ingresos_unico WHERE usuario_id = :usuarioId AND fecha < :fechaDesde), 0)
      - COALESCE((SELECT SUM(monto_ars) FROM finanzas.gastos WHERE usuario_id = :usuarioId AND fecha < :fechaDesde), 0)
      AS saldo_previo_ars,
      COALESCE((SELECT SUM(monto_usd) FROM finanzas.ingresos_unico WHERE usuario_id = :usuarioId AND fecha < :fechaDesde), 0)
      - COALESCE((SELECT SUM(monto_usd) FROM finanzas.gastos WHERE usuario_id = :usuarioId AND fecha < :fechaDesde), 0)
      AS saldo_previo_usd
  `, {
    replacements: { usuarioId, fechaDesde },
    type: QueryTypes.SELECT
  });

  // Ingresos recurrentes previos al rango también contribuyen al saldo previo
  const ingresosRecurrentesPrevios = await calcularIngresosRecurrentesPrevios(
    usuarioId, fechaDesde
  );

  const saldoPrevioArs = parseFloat(saldoPrevio?.saldo_previo_ars || 0) + ingresosRecurrentesPrevios.ars;
  const saldoPrevioUsd = parseFloat(saldoPrevio?.saldo_previo_usd || 0) + ingresosRecurrentesPrevios.usd;

  // Query 1: Gastos agrupados por mes
  const gastosPorMes = await sequelize.query(`
    SELECT
      TO_CHAR(fecha, 'YYYY-MM') as mes,
      COALESCE(SUM(monto_ars), 0) as total_ars,
      COALESCE(SUM(monto_usd), 0) as total_usd
    FROM finanzas.gastos
    WHERE usuario_id = :usuarioId
      AND fecha >= :fechaDesde
      AND fecha <= :fechaHasta
    GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    ORDER BY mes
  `, {
    replacements: { usuarioId, fechaDesde, fechaHasta },
    type: QueryTypes.SELECT
  });

  // Query 2: Ingresos únicos agrupados por mes
  const ingresosUnicosPorMes = await sequelize.query(`
    SELECT
      TO_CHAR(fecha, 'YYYY-MM') as mes,
      COALESCE(SUM(monto_ars), 0) as total_ars,
      COALESCE(SUM(monto_usd), 0) as total_usd
    FROM finanzas.ingresos_unico
    WHERE usuario_id = :usuarioId
      AND fecha >= :fechaDesde
      AND fecha <= :fechaHasta
    GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    ORDER BY mes
  `, {
    replacements: { usuarioId, fechaDesde, fechaHasta },
    type: QueryTypes.SELECT
  });

  // Query 3: Ingresos recurrentes activos
  const ingresosRecurrentes = await IngresoRecurrente.findAll({
    where: {
      usuario_id: usuarioId,
      activo: true
    },
    raw: true
  });

  // Generar todos los meses del rango
  const meses = generarMeses(desde, hasta);

  // Crear mapas para lookup rápido
  const gastosMap = new Map(gastosPorMes.map(g => [g.mes, g]));
  const ingresosUnicosMap = new Map(ingresosUnicosPorMes.map(i => [i.mes, i]));

  // Calcular evolución - arrancar desde balance_inicial + todo lo previo al rango
  let acumuladoArs = balanceInicial + saldoPrevioArs;
  let acumuladoUsd = saldoPrevioUsd;

  const evolucion = meses.map(mes => {
    const gastos = gastosMap.get(mes) || { total_ars: 0, total_usd: 0 };
    const ingresosU = ingresosUnicosMap.get(mes) || { total_ars: 0, total_usd: 0 };

    // Calcular ingresos recurrentes para este mes
    const inicioMesStr = `${mes}-01`;
    const finMesStr = getLastDayOfMonth(mes);

    let ingresosRecArs = 0;
    let ingresosRecUsd = 0;

    ingresosRecurrentes.forEach(rec => {
      // Verificar si el recurrente aplica en este mes
      if (rec.fecha_inicio && rec.fecha_inicio > finMesStr) return;
      if (rec.fecha_fin && rec.fecha_fin < inicioMesStr) return;

      ingresosRecArs += parseFloat(rec.monto_ars || 0);
      ingresosRecUsd += parseFloat(rec.monto_usd || 0);
    });

    const totalIngresosArs = parseFloat(ingresosU.total_ars) + ingresosRecArs;
    const totalIngresosUsd = parseFloat(ingresosU.total_usd) + ingresosRecUsd;
    const totalGastosArs = parseFloat(gastos.total_ars);
    const totalGastosUsd = parseFloat(gastos.total_usd);

    const saldoArs = totalIngresosArs - totalGastosArs;
    const saldoUsd = totalIngresosUsd - totalGastosUsd;

    acumuladoArs += saldoArs;
    acumuladoUsd += saldoUsd;

    return {
      mes,
      ingresos_ars: round2(totalIngresosArs),
      gastos_ars: round2(totalGastosArs),
      saldo_ars: round2(saldoArs),
      acumulado_ars: round2(acumuladoArs),
      ingresos_usd: round2(totalIngresosUsd),
      gastos_usd: round2(totalGastosUsd),
      saldo_usd: round2(saldoUsd),
      acumulado_usd: round2(acumuladoUsd)
    };
  });

  return {
    balance_inicial: balanceInicial,
    meses: evolucion,
    balance_actual_ars: evolucion.length > 0 ? evolucion[evolucion.length - 1].acumulado_ars : balanceInicial,
    balance_actual_usd: evolucion.length > 0 ? evolucion[evolucion.length - 1].acumulado_usd : 0
  };
}

/**
 * Calcula la suma de ingresos recurrentes para todos los meses previos al rango
 * @param {number} usuarioId
 * @param {string} fechaDesde - Fecha inicio del rango (YYYY-MM-DD)
 * @returns {Promise<{ars: number, usd: number}>}
 */
async function calcularIngresosRecurrentesPrevios(usuarioId, fechaDesde) {
  const recurrentes = await IngresoRecurrente.findAll({
    where: { usuario_id: usuarioId, activo: true },
    raw: true
  });

  if (recurrentes.length === 0) return { ars: 0, usd: 0 };

  // Encontrar el mes más antiguo con datos del usuario
  const [oldest] = await sequelize.query(`
    SELECT MIN(fecha) as min_fecha FROM (
      SELECT MIN(fecha) as fecha FROM finanzas.gastos WHERE usuario_id = :usuarioId
      UNION ALL
      SELECT MIN(fecha) as fecha FROM finanzas.ingresos_unico WHERE usuario_id = :usuarioId
    ) t
  `, { replacements: { usuarioId }, type: QueryTypes.SELECT });

  if (!oldest?.min_fecha) return { ars: 0, usd: 0 };

  const primerMes = oldest.min_fecha.slice(0, 7);
  const mesAntesDel = fechaDesde.slice(0, 7);

  // Si no hay meses previos, retornar 0
  if (primerMes >= mesAntesDel) return { ars: 0, usd: 0 };

  const mesesPrevios = generarMeses(primerMes, getPreviousMonth(mesAntesDel));
  let totalArs = 0;
  let totalUsd = 0;

  mesesPrevios.forEach(mes => {
    const inicioMesStr = `${mes}-01`;
    const finMesStr = getLastDayOfMonth(mes);

    recurrentes.forEach(rec => {
      if (rec.fecha_inicio && rec.fecha_inicio > finMesStr) return;
      if (rec.fecha_fin && rec.fecha_fin < inicioMesStr) return;
      totalArs += parseFloat(rec.monto_ars || 0);
      totalUsd += parseFloat(rec.monto_usd || 0);
    });
  });

  return { ars: totalArs, usd: totalUsd };
}

/**
 * Obtiene el mes anterior a un mes dado (YYYY-MM)
 */
function getPreviousMonth(mesStr) {
  const [anio, mes] = mesStr.split('-').map(Number);
  if (mes === 1) return `${anio - 1}-12`;
  return `${anio}-${String(mes - 1).padStart(2, '0')}`;
}

/**
 * Genera un array de strings YYYY-MM entre dos meses
 */
export function generarMeses(desde, hasta) {
  const meses = [];
  const [anioDesde, mesDesde] = desde.split('-').map(Number);
  const [anioHasta, mesHasta] = hasta.split('-').map(Number);

  let anio = anioDesde;
  let mes = mesDesde;

  while (anio < anioHasta || (anio === anioHasta && mes <= mesHasta)) {
    meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
    mes++;
    if (mes > 12) {
      mes = 1;
      anio++;
    }
  }

  return meses;
}

/**
 * Obtiene el último día de un mes dado en formato YYYY-MM
 */
export function getLastDayOfMonth(mesStr) {
  const [anio, mes] = mesStr.split('-').map(Number);
  const lastDay = new Date(anio, mes, 0).getDate();
  return `${mesStr}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Redondea a 2 decimales
 */
export function round2(num) {
  return Math.round(num * 100) / 100;
}

export default {
  getEvolucionMensual
};
