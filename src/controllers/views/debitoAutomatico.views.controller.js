import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { DebitoAutomaticoController } from '../api/debitoAutomatico.controller.js';
import logger from '../../utils/logger.js';

// Instancia del API controller para reutilizar lógica de business rules
const apiController = new DebitoAutomaticoController();

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
  
  return {
    categorias: categorias.map(c => c.get({ plain: true })),
    importancias: importancias.map(i => i.get({ plain: true })),
    tiposPago: tiposPago.map(t => t.get({ plain: true })),
    tarjetas: tarjetas.map(t => t.get({ plain: true })),
    frecuencias: frecuencias.map(f => f.get({ plain: true }))
  };
}

export const renderListaDebitosAutomaticos = async (req, res) => {
  try {
    const debitos = await DebitoAutomatico.findAll({
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ],
      order: [['descripcion', 'ASC']]
    });

    const debitosPlanos = debitos.map(debito => debito.get({ plain: true }));
    res.render('debitosAutomaticos/lista', { debitos: debitosPlanos });
  } catch (error) {
    logger.error('Error al obtener débitos automáticos:', { error });
    res.status(500).send('Error al obtener débitos automáticos');
  }
};

export const renderFormNuevoDebitoAutomatico = async (req, res) => {
  try {
    const refData = await getReferenceData();
    res.render('debitosAutomaticos/nuevo', { ...refData });
  } catch (error) {
    logger.error('Error al obtener datos de referencia:', { error });
    res.status(500).send('Error al cargar el formulario');
  }
};

export const renderDetalleDebitoAutomatico = async (req, res) => {
  try {
    const debito = await DebitoAutomatico.findByPk(req.params.id, {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: FrecuenciaGasto, as: 'frecuencia' }
      ]
    });

    if (!debito) {
      return res.status(404).send('Débito automático no encontrado');
    }

    res.render('debitosAutomaticos/detalle', { debito: debito.get({ plain: true }) });
  } catch (error) {
    logger.error('Error al obtener detalle de débito automático:', { error });
    res.status(500).send('Error al obtener detalle de débito automático');
  }
};

export const renderFormEditarDebitoAutomatico = async (req, res) => {
  try {
    const [debito, refData] = await Promise.all([
      DebitoAutomatico.findByPk(req.params.id),
      getReferenceData()
    ]);

    if (!debito) {
      return res.status(404).send('Débito automático no encontrado');
    }

    res.render('debitosAutomaticos/editar', {
      debito: debito.get({ plain: true }),
      ...refData
    });
  } catch (error) {
    logger.error('Error al obtener datos para edición:', { error });
    res.status(500).send('Error al cargar el formulario de edición');
  }
};

export const handleFormNuevoDebitoAutomatico = async (req, res) => {
  try {
    // Limpiar datos del formulario
    const cleanData = cleanFormData(req.body);
    
    // Usar el API controller para crear el débito automático
    const mockRes = createMockResponse();
    await apiController.create({ body: cleanData }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status !== 201) {
      throw new Error(result.data.message || 'Error al crear débito automático');
    }
    
    logger.info('Débito automático creado desde vista:', { id: result.data.debitoAutomatico.id });
    res.redirect('/debitos-automaticos');
  } catch (error) {
    logger.error('Error al crear débito automático:', { error });
    const refData = await getReferenceData();
    res.render('debitosAutomaticos/nuevo', {
      ...refData,
      error: error.message,
      formData: req.body
    });
  }
};

export const handleFormEditarDebitoAutomatico = async (req, res) => {
  try {
    // Limpiar datos del formulario
    const cleanData = cleanFormData(req.body);
    
    // Usar el API controller para actualizar el débito automático
    const mockRes = createMockResponse();
    await apiController.update({ params: req.params, body: cleanData }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status >= 400) {
      throw new Error(result.data.message || 'Error al actualizar débito automático');
    }
    
    logger.info('Débito automático actualizado desde vista:', { id: req.params.id });
    res.redirect('/debitos-automaticos');
  } catch (error) {
    logger.error('Error al actualizar débito automático:', { error });
    const refData = await getReferenceData();
    res.render('debitosAutomaticos/editar', {
      error: error.message,
      debito: { ...req.body, id: req.params.id },
      ...refData
    });
  }
};

export const handleDeleteDebitoAutomatico = async (req, res) => {
  try {
    // Usar el API controller para eliminar el débito automático
    const mockRes = createMockResponse();
    await apiController.delete({ params: req.params }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status >= 400) {
      throw new Error(result.data.message || 'Error al eliminar débito automático');
    }
    
    logger.info('Débito automático eliminado desde vista:', { id: req.params.id });
    res.redirect('/debitos-automaticos');
  } catch (error) {
    logger.error('Error al eliminar débito automático:', { error });
    res.status(500).send('Error al eliminar el débito automático');
  }
}; 