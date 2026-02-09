import { GastoRecurrente, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoRecurrenteController } from '../api/gastoRecurrente.controller.js';
import logger from '../../utils/logger.js';

// Instancia del API controller para reutilizar lógica de business rules
const apiController = new GastoRecurrenteController();

// Helper para capturar respuestas del API controller
function createMockResponse() {
  let result = {};
  return {
    status: (code) => ({
      json: (data) => { result = { status: code, data }; return result; }
    }),
    json: (data) => { result = { status: 200, data }; return result; },
    getResult: () => result
  };
}

// Helper para limpiar datos del formulario antes de enviar al API
function cleanFormData(body) {
  const cleaned = { ...body };

  // Convertir strings vacíos a null para campos opcionales
  if (cleaned.tarjeta_id === '' || cleaned.tarjeta_id === undefined) {
    cleaned.tarjeta_id = null;
  }
  if (cleaned.mes_de_pago === '' || cleaned.mes_de_pago === undefined) {
    cleaned.mes_de_pago = null;
  }
  if (cleaned.fecha_inicio === '' || cleaned.fecha_inicio === undefined) {
    cleaned.fecha_inicio = null;
  }

  // Asegurar tipos numéricos correctos
  if (cleaned.monto) cleaned.monto = parseFloat(cleaned.monto);
  if (cleaned.dia_de_pago) cleaned.dia_de_pago = parseInt(cleaned.dia_de_pago);
  if (cleaned.mes_de_pago) cleaned.mes_de_pago = parseInt(cleaned.mes_de_pago);
  if (cleaned.categoria_gasto_id) cleaned.categoria_gasto_id = parseInt(cleaned.categoria_gasto_id);
  if (cleaned.importancia_gasto_id) cleaned.importancia_gasto_id = parseInt(cleaned.importancia_gasto_id);
  if (cleaned.tipo_pago_id) cleaned.tipo_pago_id = parseInt(cleaned.tipo_pago_id);
  if (cleaned.frecuencia_gasto_id) cleaned.frecuencia_gasto_id = parseInt(cleaned.frecuencia_gasto_id);
  if (cleaned.tarjeta_id) cleaned.tarjeta_id = parseInt(cleaned.tarjeta_id);

  // Manejar checkbox de activo
  if (cleaned.activo === 'on') cleaned.activo = true;
  if (cleaned.activo === '' || cleaned.activo === undefined || cleaned.activo === 'off') cleaned.activo = false;

  // Manejar checkbox de generar_mes_actual
  if (cleaned.generar_mes_actual === 'on') cleaned.generar_mes_actual = true;
  if (cleaned.generar_mes_actual === '' || cleaned.generar_mes_actual === undefined) cleaned.generar_mes_actual = false;

  return cleaned;
}

// Helper function to get reference data for forms
async function getReferenceData() {
  const [categorias, importancias, tiposPago, tarjetas, frecuencias] = await Promise.all([
    CategoriaGasto.findAll(),
    ImportanciaGasto.findAll(),
    TipoPago.findAll(),
    Tarjeta.findAll(),
    FrecuenciaGasto.findAll()
  ]);

  logger.debug('Datos de referencia disponibles:', {
    categorias: categorias.map(c => ({ id: c.id, nombre: c.nombre_categoria })),
    importancias: importancias.map(i => ({ id: i.id, nombre: i.nombre_importancia })),
    tiposPago: tiposPago.map(t => ({ id: t.id, nombre: t.nombre })),
    tarjetas: tarjetas.map(t => ({ id: t.id, nombre: t.nombre })),
    frecuencias: frecuencias.map(f => ({ id: f.id, nombre: f.nombre_frecuencia }))
  });

  return {
    categorias: categorias.map(c => c.get({ plain: true })),
    importancias: importancias.map(i => i.get({ plain: true })),
    tiposPago: tiposPago.map(t => t.get({ plain: true })),
    tarjetas: tarjetas.map(t => t.get({ plain: true })),
    frecuencias: frecuencias.map(f => f.get({ plain: true }))
  };
}

export const renderListaGastosRecurrentes = async (req, res) => {
  try {
    const gastos = await GastoRecurrente.findAll({
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      order: [['descripcion', 'ASC']]
    });

    const gastosPlanos = gastos.map(gasto => gasto.get({ plain: true }));
    res.render('gastosRecurrentes/lista', { gastos: gastosPlanos });
  } catch (error) {
    logger.error('Error al obtener gastos recurrentes:', { error });
    res.status(500).send('Error al obtener gastos recurrentes');
  }
};

export const renderFormNuevoGastoRecurrente = async (req, res) => {
  try {
    const refData = await getReferenceData();
    res.render('gastosRecurrentes/nuevo', { ...refData });
  } catch (error) {
    logger.error('Error al obtener datos de referencia:', { error });
    res.status(500).send('Error al cargar el formulario');
  }
};

export const renderDetalleGastoRecurrente = async (req, res) => {
  try {
    const gasto = await GastoRecurrente.findByPk(req.params.id, {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });

    if (!gasto) {
      return res.status(404).send('Gasto recurrente no encontrado');
    }

    res.render('gastosRecurrentes/detalle', { gasto: gasto.get({ plain: true }) });
  } catch (error) {
    logger.error('Error al obtener detalle de gasto recurrente:', { error });
    res.status(500).send('Error al obtener detalle de gasto recurrente');
  }
};

export const renderFormEditarGastoRecurrente = async (req, res) => {
  try {
    const [gasto, refData] = await Promise.all([
      GastoRecurrente.findByPk(req.params.id),
      getReferenceData()
    ]);

    if (!gasto) {
      return res.status(404).send('Gasto recurrente no encontrado');
    }

    res.render('gastosRecurrentes/editar', {
      gasto: gasto.get({ plain: true }),
      ...refData
    });
  } catch (error) {
    logger.error('Error al obtener datos para edición:', { error });
    res.status(500).send('Error al cargar el formulario de edición');
  }
};

export const handleFormNuevoGastoRecurrente = async (req, res) => {
  try {
    logger.debug('Datos recibidos en formulario:', req.body);

    // Limpiar datos del formulario antes de enviar al API
    req.body = cleanFormData(req.body);
    logger.debug('Datos limpiados:', req.body);

    // Usar el API controller para mantener business rules consistentes
    const mockRes = createMockResponse();
    await apiController.create(req, mockRes);
    const result = mockRes.getResult();

    if (result.status === 201) {
      logger.info('Gasto recurrente creado exitosamente desde vista:', {
        gastoRecurrente_id: result.data.gastoRecurrente?.id,
        gasto_id: result.data.gasto?.id
      });
      return res.redirect('/gastos-recurrentes');
    } else {
      // Manejar errores del API
      const refData = await getReferenceData();
      return res.render('gastosRecurrentes/nuevo', {
        ...refData,
        error: result.data.error || 'Error al crear el gasto recurrente',
        details: result.data.details,
        formData: req.body
      });
    }
  } catch (error) {
    logger.error('Error en handleFormNuevoGastoRecurrente:', { error });
    const refData = await getReferenceData();
    res.render('gastosRecurrentes/nuevo', {
      ...refData,
      error: 'Error interno del servidor',
      details: error.message,
      formData: req.body
    });
  }
};

export const handleFormEditarGastoRecurrente = async (req, res) => {
  try {
    logger.debug('Datos recibidos para edición:', { body: req.body, params: req.params });

    // Limpiar datos del formulario antes de enviar al API
    req.body = cleanFormData(req.body);
    logger.debug('Datos limpiados:', req.body);

    // Usar el API controller para mantener business rules consistentes
    const mockRes = createMockResponse();
    await apiController.update(req, mockRes);
    const result = mockRes.getResult();

    if (result.status === 200) {
      logger.info('Gasto recurrente actualizado exitosamente desde vista:', {
        gastoRecurrente_id: req.params.id
      });
      return res.redirect('/gastos-recurrentes');
    } else {
      // Manejar errores del API
      const refData = await getReferenceData();
      return res.render('gastosRecurrentes/editar', {
        ...refData,
        error: result.data.error || 'Error al actualizar el gasto recurrente',
        details: result.data.details,
        gasto: { ...req.body, id: req.params.id }
      });
    }
  } catch (error) {
    logger.error('Error en handleFormEditarGastoRecurrente:', { error });
    const refData = await getReferenceData();
    res.render('gastosRecurrentes/editar', {
      ...refData,
      error: 'Error interno del servidor',
      details: error.message,
      gasto: { ...req.body, id: req.params.id }
    });
  }
};

export const handleDeleteGastoRecurrente = async (req, res) => {
  try {
    logger.debug('Eliminando gasto recurrente:', { id: req.params.id });

    // Usar el API controller para mantener business rules consistentes
    const mockRes = createMockResponse();
    await apiController.delete(req, mockRes);
    const result = mockRes.getResult();

    if (result.status === 200) {
      logger.info('Gasto recurrente eliminado exitosamente desde vista:', {
        gastoRecurrente_id: req.params.id
      });
      return res.redirect('/gastos-recurrentes');
    } else if (result.status === 404) {
      return res.status(404).send('Gasto recurrente no encontrado');
    } else {
      return res.status(500).send(result.data.error || 'Error al eliminar el gasto recurrente');
    }
  } catch (error) {
    logger.error('Error en handleDeleteGastoRecurrente:', { error });
    res.status(500).send('Error interno del servidor');
  }
};
