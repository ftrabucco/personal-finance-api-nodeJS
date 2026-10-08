import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';
import { getOrCreatePreferencias } from './preferenciasUsuario.service.js';
import { ExchangeRateService } from './exchangeRate.service.js';

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

  // Los ingresos recurrentes ya no se suman aparte: el generador de
  // ingresos (ver docs/architecture/known-issues.md e
  // IngresoGeneratorService) materializa cada ocurrencia mensual como una
  // fila real en ingresos_unico con la cotización histórica de su propia
  // fecha, así que Query 0 (arriba) ya los incluye correctamente.
  const saldoPrevioArs = parseFloat(saldoPrevio?.saldo_previo_ars || 0);
  const saldoPrevioUsd = parseFloat(saldoPrevio?.saldo_previo_usd || 0);

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

  // Generar todos los meses del rango
  const meses = generarMeses(desde, hasta);

  // Crear mapas para lookup rápido
  const gastosMap = new Map(gastosPorMes.map(g => [g.mes, g]));
  const ingresosUnicosMap = new Map(ingresosUnicosPorMes.map(i => [i.mes, i]));

  // Calcular evolución - arrancar desde balance_inicial + todo lo previo al rango
  let acumuladoArs = balanceInicial + saldoPrevioArs;
  let acumuladoUsd = saldoPrevioUsd;

  // Obtener TC histórico para cada mes en paralelo (usa el último día del mes como referencia)
  const tcPorMes = await Promise.all(
    meses.map(async mes => {
      try {
        const tc = await ExchangeRateService.getRateForDate(getLastDayOfMonth(mes));
        return { mes, tc_venta: parseFloat(tc.valor_venta_usd_ars) };
      } catch {
        return { mes, tc_venta: null };
      }
    })
  );
  const tcMap = new Map(tcPorMes.map(({ mes, tc_venta }) => [mes, tc_venta]));

  const evolucion = meses.map(mes => {
    const gastos = gastosMap.get(mes) || { total_ars: 0, total_usd: 0 };
    const ingresosU = ingresosUnicosMap.get(mes) || { total_ars: 0, total_usd: 0 };

    // Los ingresos recurrentes ya están incluidos en ingresosUnicosPorMes:
    // cada ocurrencia mensual generada vive como una fila real en
    // ingresos_unico (ver IngresoGeneratorService), con la cotización
    // histórica de su propia fecha.
    const totalIngresosArs = parseFloat(ingresosU.total_ars);
    const totalIngresosUsd = parseFloat(ingresosU.total_usd);
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
      acumulado_usd: round2(acumuladoUsd),
      tipo_cambio_mes: tcMap.get(mes) ?? null
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
