import { GastoUnico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { GastoUnicoController } from '../api/gastoUnico.controller.js';
import logger from '../../utils/logger.js';

// Instancia del API controller para reutilizar lógica de business rules
const apiController = new GastoUnicoController();

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
  
  // Asegurar tipos numéricos correctos
  if (cleaned.monto) cleaned.monto = parseFloat(cleaned.monto);
  if (cleaned.categoria_gasto_id) cleaned.categoria_gasto_id = parseInt(cleaned.categoria_gasto_id);
  if (cleaned.importancia_gasto_id) cleaned.importancia_gasto_id = parseInt(cleaned.importancia_gasto_id);
  if (cleaned.tipo_pago_id) cleaned.tipo_pago_id = parseInt(cleaned.tipo_pago_id);
  if (cleaned.tarjeta_id) cleaned.tarjeta_id = parseInt(cleaned.tarjeta_id);
  
  return cleaned;
}

// Helper function to get reference data for forms
async function getReferenceData() {
  const [categorias, importancias, tiposPago, tarjetas] = await Promise.all([
    CategoriaGasto.findAll(),
    ImportanciaGasto.findAll(),
    TipoPago.findAll(),
    Tarjeta.findAll()
  ]);
  
  logger.debug('Datos de referencia disponibles:', {
    categorias: categorias.map(c => ({ id: c.id, nombre: c.nombre_categoria })),
    importancias: importancias.map(i => ({ id: i.id, nombre: i.nombre_importancia })),
    tiposPago: tiposPago.map(t => ({ id: t.id, nombre: t.nombre })),
    tarjetas: tarjetas.map(t => ({ id: t.id, nombre: t.nombre }))
  });
  
  return {
    categorias: categorias.map(c => c.get({ plain: true })),
    importancias: importancias.map(i => i.get({ plain: true })),
    tiposPago: tiposPago.map(t => t.get({ plain: true })),
    tarjetas: tarjetas.map(t => t.get({ plain: true }))
  };
}

export const renderListaGastosUnicos = async (req, res) => {
  try {
    const gastos = await GastoUnico.findAll({
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ],
      order: [['fecha', 'DESC'], ['descripcion', 'ASC']]
    });

    const gastosPlanos = gastos.map(gasto => gasto.get({ plain: true }));
    res.render('gastosUnicos/lista', { gastos: gastosPlanos });
  } catch (error) {
    logger.error('Error al obtener gastos únicos:', { error });
    res.status(500).send('Error al obtener gastos únicos');
  }
};

export const renderFormNuevoGastoUnico = async (req, res) => {
  try {
    const refData = await getReferenceData();
    res.render('gastosUnicos/nuevo', { ...refData });
  } catch (error) {
    logger.error('Error al obtener datos de referencia:', { error });
    res.status(500).send('Error al cargar el formulario');
  }
};

export const renderDetalleGastoUnico = async (req, res) => {
  try {
    const gasto = await GastoUnico.findByPk(req.params.id, {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ]
    });

    if (!gasto) {
      return res.status(404).send('Gasto único no encontrado');
    }

    res.render('gastosUnicos/detalle', { gasto: gasto.get({ plain: true }) });
  } catch (error) {
    logger.error('Error al obtener detalle de gasto único:', { error });
    res.status(500).send('Error al obtener detalle de gasto único');
  }
};

export const renderFormEditarGastoUnico = async (req, res) => {
  try {
    const [gasto, refData] = await Promise.all([
      GastoUnico.findByPk(req.params.id),
      getReferenceData()
    ]);

    if (!gasto) {
      return res.status(404).send('Gasto único no encontrado');
    }

    res.render('gastosUnicos/editar', {
      gasto: gasto.get({ plain: true }),
      ...refData
    });
  } catch (error) {
    logger.error('Error al obtener datos para edición:', { error });
    res.status(500).send('Error al cargar el formulario de edición');
  }
};

export const handleFormNuevoGastoUnico = async (req, res) => {
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
      logger.info('Gasto único creado exitosamente desde vista:', { 
        gastoUnico_id: result.data.gastoUnico?.id,
        gasto_id: result.data.gasto?.id
      });
      return res.redirect('/gastos-unicos');
    } else {
      // Manejar errores del API
      const refData = await getReferenceData();
      return res.render('gastosUnicos/nuevo', {
        ...refData,
        error: result.data.error || 'Error al crear el gasto único',
        details: result.data.details,
        formData: req.body
      });
    }
  } catch (error) {
    logger.error('Error en handleFormNuevoGastoUnico:', { error });
    const refData = await getReferenceData();
    res.render('gastosUnicos/nuevo', {
      ...refData,
      error: 'Error interno del servidor',
      details: error.message,
      formData: req.body
    });
  }
};

export const handleFormEditarGastoUnico = async (req, res) => {
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
      logger.info('Gasto único actualizado exitosamente desde vista:', { 
        gastoUnico_id: req.params.id
      });
      return res.redirect('/gastos-unicos');
    } else {
      // Manejar errores del API
      const refData = await getReferenceData();
      return res.render('gastosUnicos/editar', {
        ...refData,
        error: result.data.error || 'Error al actualizar el gasto único',
        details: result.data.details,
        gasto: { ...req.body, id: req.params.id }
      });
    }
  } catch (error) {
    logger.error('Error en handleFormEditarGastoUnico:', { error });
    const refData = await getReferenceData();
    res.render('gastosUnicos/editar', {
      ...refData,
      error: 'Error interno del servidor',
      details: error.message,
      gasto: { ...req.body, id: req.params.id }
    });
  }
};

export const handleDeleteGastoUnico = async (req, res) => {
  try {
    logger.debug('Eliminando gasto único:', { id: req.params.id });

    // Usar el API controller para mantener business rules consistentes
    const mockRes = createMockResponse();
    await apiController.delete(req, mockRes);
    const result = mockRes.getResult();

    if (result.status === 200) {
      logger.info('Gasto único eliminado exitosamente desde vista:', { 
        gastoUnico_id: req.params.id,
        gastos_eliminados: result.data.gastos_eliminados
      });
      return res.redirect('/gastos-unicos');
    } else if (result.status === 404) {
      return res.status(404).send('Gasto único no encontrado');
    } else {
      return res.status(500).send(result.data.error || 'Error al eliminar el gasto único');
    }
  } catch (error) {
    logger.error('Error en handleDeleteGastoUnico:', { error });
    res.status(500).send('Error interno del servidor');
  }
}; 