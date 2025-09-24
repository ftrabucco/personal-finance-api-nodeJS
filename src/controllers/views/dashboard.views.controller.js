import { Gasto, Compra, GastoRecurrente, DebitoAutomatico, sequelize } from '../../models/index.js';
import { Op } from 'sequelize';
import { startOfMonth, endOfMonth, format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '../../utils/logger.js';

const getCurrentMonthRange = () => {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now)
  };
};

export const renderDashboard = async (req, res) => {
  try {
    console.log('Iniciando renderización del dashboard');
    const { start, end } = getCurrentMonthRange();
    
    console.log('Obteniendo gastos del mes actual');
    let gastos = [];
    let totalGastos = 0;
    
    try {
      const fechaInicio = format(start, 'yyyy-MM-dd');
      const fechaFin = format(end, 'yyyy-MM-dd');
      
      console.log(`Buscando gastos entre ${fechaInicio} y ${fechaFin}`);
      
      // Obtener gastos con sus categorías
      console.log('Buscando gastos con los siguientes parámetros:');
      console.log('- Fecha inicio:', fechaInicio);
      console.log('- Fecha fin:', fechaFin);
      
      gastos = await Gasto.findAll({
        where: {
          fecha: {
            [Op.between]: [fechaInicio, fechaFin]
          }
        },
        include: [
          {
            model: sequelize.models.CategoriaGasto,
            as: 'categoria',
            attributes: ['id', 'nombre_categoria'],
            required: false
          }
        ],
        raw: true,
        nest: true
      });
      
      // Mapear los resultados para usar 'nombre' en lugar de 'nombre_categoria'
      gastos = gastos.map(gasto => ({
        ...gasto,
        categoria: gasto.categoria ? {
          id: gasto.categoria.id,
          nombre: gasto.categoria.nombre_categoria
        } : null
      }));
      
      console.log(`Se encontraron ${gastos.length} gastos`);
      
      // Calcular el total de gastos
      totalGastos = gastos.reduce((sum, gasto) => {
        const monto = parseFloat(gasto.monto_ars || 0);
        return isNaN(monto) ? sum : sum + monto;
      }, 0);
      
      console.log(`Total de gastos: $${totalGastos.toFixed(2)}`);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      logger.error('Error al obtener gastos', { error: error.message });
    }
    
    // Obtener próximos vencimientos
    const hoy = new Date();
    const proximoMes = addMonths(hoy, 1);
    
    // Obtener compras con cuotas pendientes
    let compras = [];
    try {
      compras = await Compra.findAll({
        where: {
          pendiente_cuotas: true
        },
        include: [
          {
            model: sequelize.models.Tarjeta,
            as: 'tarjeta',
            attributes: ['id', 'nombre', 'dia_vencimiento'],
            required: false
          },
          {
            model: sequelize.models.TipoPago,
            as: 'tipoPago',
            attributes: ['id', 'nombre'],
            required: true
          }
        ],
        order: [['fecha_compra', 'ASC']],
        raw: true,
        nest: true
      });
      console.log(`Encontradas ${compras.length} compras recientes`);
    } catch (error) {
      console.error('Error al obtener compras:', error);
      compras = [];
    }
    
    // Obtener gastos recurrentes
    let gastosRecurrentes = [];
    try {
      const allGastosRecurrentes = await GastoRecurrente.findAll({
        where: { activo: true },
        raw: true
      });
      
      // Calcular próximos vencimientos para gastos recurrentes
      console.log(`Total gastos recurrentes activos encontrados: ${allGastosRecurrentes.length}`);
      
      gastosRecurrentes = allGastosRecurrentes.map(gasto => {
        const diaPago = gasto.dia_de_pago;
        console.log(`Procesando gasto recurrente: ${gasto.descripcion}, día de pago: ${diaPago}`);
        
        if (!diaPago || diaPago < 1 || diaPago > 31) {
          console.warn(`Gasto recurrente con día de pago inválido: ${gasto.descripcion}, día: ${diaPago}`);
          return null;
        }
        
        let proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
        
        if (hoy.getDate() > diaPago) {
          proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaPago);
        }
        
        const item = {
          ...gasto,
          tipo: 'gasto recurrente',
          fecha_vencimiento: format(proximoVencimiento, 'dd/MM/yyyy'),
          fecha_comparacion: format(proximoVencimiento, 'yyyy-MM-dd'),
          monto_ars: gasto.monto || 0,
          descripcion: gasto.descripcion || 'Gasto recurrente'
        };
        
        console.log(`Gasto recurrente procesado: ${item.descripcion}, vencimiento: ${item.fecha_vencimiento}`);
        return item;
      }).filter(gasto => {
        if (!gasto) return false;
        
        const fechaValida = gasto.fecha_comparacion >= format(hoy, 'yyyy-MM-dd') && 
                          gasto.fecha_comparacion <= format(proximoMes, 'yyyy-MM-dd');
        
        console.log(`Filtro fecha - Gasto: ${gasto.descripcion}, Fecha: ${gasto.fecha_comparacion}, Válido: ${fechaValida}`);
        return fechaValida;
      }).sort((a, b) => a.fecha_comparacion.localeCompare(b.fecha_comparacion))
        .slice(0, 5);
        
      console.log(`Encontrados ${gastosRecurrentes.length} gastos recurrentes con vencimiento próximo`);
    } catch (error) {
      console.error('Error al obtener gastos recurrentes:', error);
      gastosRecurrentes = [];
    }
    
    // Obtener débitos automáticos
    let debitos = [];
    try {
      console.log('Buscando débitos automáticos...');
      const debitosRaw = await DebitoAutomatico.findAll({
        where: { activo: true },
        raw: true,
        logging: console.log // Habilitar logging de la consulta SQL
      });
      console.log('Débitos automáticos encontrados:', JSON.stringify(debitosRaw, null, 2));
      
      // Calcular próximos vencimientos para débitos automáticos
      console.log(`Total débitos automáticos encontrados: ${debitosRaw.length}`);
      
      debitos = debitosRaw.map(debito => {
        const diaPago = debito.dia_de_pago;
        console.log(`Procesando débito automático: ${debito.descripcion}, día de pago: ${diaPago}`);
        
        if (!diaPago || diaPago < 1 || diaPago > 31) {
          console.warn(`Débito automático con día de pago inválido: ${debito.descripcion}, día: ${diaPago}`);
          return null;
        }
        
        let proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
        
        if (hoy.getDate() > diaPago) {
          proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaPago);
        }
        
        const item = {
          ...debito,
          tipo: 'débito automático',
          fecha_vencimiento: format(proximoVencimiento, 'dd/MM/yyyy'),
          fecha_comparacion: format(proximoVencimiento, 'yyyy-MM-dd'),
          monto_ars: debito.monto || 0,
          descripcion: debito.descripcion || 'Débito automático'
        };
        
        console.log(`Débito automático procesado: ${item.descripcion}, vencimiento: ${item.fecha_vencimiento}`);
        return item;
      }).filter(debito => {
        if (!debito) return false;
        
        const fechaValida = debito.fecha_comparacion >= format(hoy, 'yyyy-MM-dd') && 
                          debito.fecha_comparacion <= format(proximoMes, 'yyyy-MM-dd');
        
        console.log(`Filtro fecha - Débito: ${debito.descripcion}, Fecha: ${debito.fecha_comparacion}, Válido: ${fechaValida}`);
        return fechaValida;
      }).sort((a, b) => a.fecha_comparacion.localeCompare(b.fecha_comparacion))
        .slice(0, 5);
        
      console.log(`Encontrados ${debitos.length} débitos automáticos con vencimiento próximo`);
    } catch (error) {
      console.error('Error al obtener débitos automáticos:', error);
      debitos = [];
    }
    
    // Procesar compras para mostrar información de cuotas
    const comprasProcesadas = [];
    
    for (const compra of compras) {
      const esCredito = compra.tipoPago && compra.tipoPago.nombre.toLowerCase().includes('crédito');
      const cuotasTotales = compra.cantidad_cuotas || 1;
      
      // Contar cuántas cuotas ya se generaron para esta compra
      const gastosGenerados = await sequelize.models.Gasto.count({
        where: {
          tipo_origen: 'compra',
          id_origen: compra.id
        }
      });
      
      const cuotasPagadas = gastosGenerados;
      const cuotasPendientes = cuotasTotales - cuotasPagadas;
      const montoCuota = compra.monto_total / cuotasTotales;
      
      console.log(`Procesando compra ${compra.id}: ${compra.descripcion}`);
      console.log(`  - Cuotas totales: ${cuotasTotales}, Cuotas pagadas: ${cuotasPagadas}, Pendientes: ${cuotasPendientes}`);
      console.log(`  - Monto total: ${compra.monto_total}, Monto por cuota: ${montoCuota.toFixed(2)}`);
      
      // Determinar fechas de vencimiento según el tipo de pago
      if (esCredito && compra.tarjeta && compra.tarjeta.dia_vencimiento) {
        // Para tarjetas de crédito, generar una cuota por mes en la fecha de vencimiento de la tarjeta
        const hoy = new Date();
        let mesVencimiento = hoy.getMonth();
        let anioVencimiento = hoy.getFullYear();
        
        // Ajustar para el próximo vencimiento si ya pasó este mes
        if (hoy.getDate() > compra.tarjeta.dia_vencimiento) {
          mesVencimiento++;
          if (mesVencimiento > 11) {
            mesVencimiento = 0;
            anioVencimiento++;
          }
        }
        
        // Generar solo la próxima cuota pendiente
        if (cuotasPendientes > 0) {
          const fechaVencimiento = new Date(anioVencimiento, mesVencimiento, compra.tarjeta.dia_vencimiento);
          const numCuota = cuotasPagadas + 1;
          
          const itemProcesado = {
            ...compra,
            tipo: 'compra',
            descripcion: `${compra.descripcion || 'Compra sin descripción'} (${numCuota}/${cuotasTotales})`,
            monto_ars: montoCuota.toFixed(2),
            fecha_vencimiento: format(fechaVencimiento, 'dd/MM/yyyy'),
            fecha_comparacion: format(fechaVencimiento, 'yyyy-MM-dd'),
            esCredito: true
          };
          console.log(`  - Agregando cuota de crédito: ${itemProcesado.descripcion}, Monto: ${itemProcesado.monto_ars}`);
          comprasProcesadas.push(itemProcesado);
        }
      } else {
        // Para efectivo/transferencia, generar solo la siguiente cuota pendiente
        if (cuotasPendientes > 0) {
          const numCuota = cuotasPagadas + 1;
          let fechaVencimiento = new Date(compra.fecha_compra);
          
          // Si es una cuota posterior, calcular la fecha sumando los meses
          if (numCuota > 1) {
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (numCuota - 1));
          }
          
          const itemProcesado = {
            ...compra,
            tipo: 'compra',
            descripcion: `${compra.descripcion || 'Compra sin descripción'} (${numCuota}/${cuotasTotales})`,
            monto_ars: montoCuota.toFixed(2),
            fecha_vencimiento: format(fechaVencimiento, 'dd/MM/yyyy'),
            fecha_comparacion: format(fechaVencimiento, 'yyyy-MM-dd'),
            esCredito: false
          };
          console.log(`  - Agregando cuota efectivo/débito: ${itemProcesado.descripcion}, Monto: ${itemProcesado.monto_ars}`);
          comprasProcesadas.push(itemProcesado);
        }
      }
    }
    
    // Log para depuración
    console.log('Débitos antes de combinar:', JSON.stringify(debitos, null, 2));
    
    // Combinar y ordenar todos los vencimientos
    const todosLosItems = [
      ...comprasProcesadas.map(compra => ({
        ...compra,
        tipo: 'compra',
        monto_ars: compra.monto_ars || '0.00'
      })),
      ...gastosRecurrentes.map(gasto => ({
        ...gasto,
        monto_ars: parseFloat(gasto.monto_ars || 0).toFixed(2)
      })),
      ...debitos.map(debito => ({
        ...debito,
        monto_ars: parseFloat(debito.monto_ars || 0).toFixed(2)
      }))
    ];
    
    console.log(`Items antes del sort: ${todosLosItems.length}`);
    todosLosItems.forEach(item => {
      console.log(`- ${item.tipo}: ${item.descripcion} - ${item.fecha_comparacion} (${item.fecha_vencimiento})`);
    });
    
    const todosLosVencimientos = todosLosItems
      .sort((a, b) => a.fecha_comparacion.localeCompare(b.fecha_comparacion))
      .slice(0, 5);
    
    console.log(`Items después del sort y slice: ${todosLosVencimientos.length}`);
    todosLosVencimientos.forEach(item => {
      console.log(`- ${item.tipo}: ${item.descripcion} - ${item.fecha_comparacion} (${item.fecha_vencimiento})`);
    });
    
    console.log(`Total de vencimientos próximos: ${todosLosVencimientos.length}`);
    
    // Calcular gastos por categoría
    const gastosPorCategoria = {};
    
    gastos.forEach((gasto, index) => {
      const categoriaId = gasto.categoria?.id || 'sin-categoria';
      const categoriaNombre = gasto.categoria?.nombre || 'Sin categoría';
      const monto = parseFloat(gasto.monto_ars) || 0;
      
      if (!gastosPorCategoria[categoriaId]) {
        gastosPorCategoria[categoriaId] = {
          id: categoriaId,
          nombre: categoriaNombre,
          total: 0
        };
      }
      
      gastosPorCategoria[categoriaId].total += monto;
      
      // Solo mostrar detalles de los primeros 3 gastos para no saturar los logs
      if (index < 3) {
        console.log(`Gasto ${index + 1}:`, {
          id: gasto.id,
          descripcion: gasto.descripcion,
          monto_ars: gasto.monto_ars,
          categoria_id: gasto.categoria_gasto_id,
          categoria_nombre: categoriaNombre,
          fecha: gasto.fecha
        });
      }
    });
    
    // Preparar datos para el gráfico
    const gastosGrafico = Object.values(gastosPorCategoria)
      .filter(cat => cat && cat.total > 0)
      .map(cat => ({
        categoria: cat.nombre,
        monto: parseFloat(cat.total.toFixed(2))
      }));
    
    console.log('Datos para el gráfico:', JSON.stringify(gastosGrafico, null, 2));
    
    // Obtener el total de categorías existentes
    const totalCategorias = await sequelize.models.CategoriaGasto.count();
    
    // Contar categorías con gastos este mes (no enviar el array completo como length)
    const categoriasConGastos = gastosGrafico.length;
    
    // Debug: Log the upcoming payments data
    console.log('Próximos vencimientos para la vista:', JSON.stringify(todosLosVencimientos.map(v => ({
      descripcion: v.descripcion,
      monto: v.monto_ars,
      fecha_vencimiento: v.fecha_vencimiento,
      tipo: v.tipo,
      cantidad_cuotas: v.cantidad_cuotas,
      dia_vencimiento: v.dia_vencimiento
    })), null, 2));

    // Renderizar la vista con los datos
    res.render('dashboard/index', {
      title: 'Panel de Control',
      mesActual: format(new Date(), 'MMMM yyyy', { locale: es }),
      totalGastos: totalGastos ? totalGastos.toFixed(2) : '0.00',
      proximosVencimientos: todosLosVencimientos,
      datosGrafico: JSON.stringify(gastosGrafico),
      totalCategorias: totalCategorias,
      categoriasConGastos: categoriasConGastos,
      totalTransacciones: gastos.length
    });
    
  } catch (error) {
    console.error('Error en renderDashboard:', error);
    logger.error('Error en renderDashboard', { error: error.message, stack: error.stack });
    res.status(500).render('error', {
      title: 'Error',
      message: 'Ha ocurrido un error al cargar el panel de control.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};
