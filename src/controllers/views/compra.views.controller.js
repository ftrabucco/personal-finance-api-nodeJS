import { Compra, CategoriaGasto, ImportanciaGasto, Tarjeta, TipoPago } from '../../models/index.js';
import { CompraController } from '../api/compra.controller.js';
import logger from '../../utils/logger.js';

// Instancia del API controller para reutilizar lógica de business rules
const apiController = new CompraController();

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
  if (cleaned.monto_total) cleaned.monto_total = parseFloat(cleaned.monto_total);
  if (cleaned.cantidad_cuotas) cleaned.cantidad_cuotas = parseInt(cleaned.cantidad_cuotas) || 1;
  if (cleaned.categoria_gasto_id) cleaned.categoria_gasto_id = parseInt(cleaned.categoria_gasto_id);
  if (cleaned.importancia_gasto_id) cleaned.importancia_gasto_id = parseInt(cleaned.importancia_gasto_id);
  if (cleaned.tipo_pago_id) cleaned.tipo_pago_id = parseInt(cleaned.tipo_pago_id);
  if (cleaned.tarjeta_id) cleaned.tarjeta_id = parseInt(cleaned.tarjeta_id);
  
  // Manejar checkbox de pendiente_cuotas
  if (cleaned.pendiente_cuotas === 'on') cleaned.pendiente_cuotas = true;
  if (cleaned.pendiente_cuotas === '' || cleaned.pendiente_cuotas === undefined || cleaned.pendiente_cuotas === 'off') cleaned.pendiente_cuotas = false;
  
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
  
  return {
    categorias: categorias.map(c => c.get({ plain: true })),
    importancias: importancias.map(i => i.get({ plain: true })),
    tiposPago: tiposPago.map(t => t.get({ plain: true })),
    tarjetas: tarjetas.map(t => t.get({ plain: true }))
  };
}

export const renderListaCompras = async (req, res) => {
  try {
    const compras = await Compra.findAll({
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: TipoPago, as: 'tipoPago' }
      ],
      order: [['fecha_compra', 'DESC']]
    });

    const comprasPlanas = compras.map(compra => compra.get({ plain: true }));
    res.render('compras/lista', { compras: comprasPlanas });
  } catch (error) {
    logger.error('Error al obtener compras:', { error });
    res.status(500).send('Error al obtener compras');
  }
};

export const renderFormNuevaCompra = async (req, res) => {
  try {
    const refData = await getReferenceData();
    res.render('compras/nueva', { ...refData });
  } catch (error) {
    logger.error('Error al obtener datos de referencia:', { error });
    res.status(500).send('Error al cargar el formulario');
  }
};

export const renderDetalleCompra = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id, {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: Tarjeta, as: 'tarjeta' },
        { model: TipoPago, as: 'tipoPago' }
      ]
    });

    if (!compra) {
      return res.status(404).send('Compra no encontrada');
    }

    res.render('compras/detalle', { compra: compra.get({ plain: true }) });
  } catch (error) {
    logger.error('Error al obtener detalle de compra:', { error });
    res.status(500).send('Error al obtener detalle de compra');
  }
};

export const renderFormEditarCompra = async (req, res) => {
  try {
    const [compra, refData] = await Promise.all([
      Compra.findByPk(req.params.id),
      getReferenceData()
    ]);

    if (!compra) {
      return res.status(404).send('Compra no encontrada');
    }

    res.render('compras/editar', { 
      compra: compra.get({ plain: true }),
      ...refData
    });
  } catch (error) {
    logger.error('Error al obtener datos para edición:', { error });
    res.status(500).send('Error al cargar el formulario de edición');
  }
};

export const handleFormNuevaCompra = async (req, res) => {
  try {
    // Limpiar datos del formulario
    const cleanData = cleanFormData(req.body);
    
    // Usar el API controller para crear la compra
    const mockRes = createMockResponse();
    await apiController.create({ body: cleanData }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status !== 201) {
      throw new Error(result.data.message || 'Error al crear compra');
    }
    
    logger.info('Compra creada desde vista:', { id: result.data.compra.id });
    res.redirect('/compras');
  } catch (error) {
    logger.error('Error al crear compra:', { error });
    const refData = await getReferenceData();
    res.render('compras/nueva', {
      error: error.message,
      formData: req.body,
      ...refData
    });
  }
};

export const handleFormEditarCompra = async (req, res) => {
  try {
    // Limpiar datos del formulario
    const cleanData = cleanFormData(req.body);
    
    // Usar el API controller para actualizar la compra
    const mockRes = createMockResponse();
    await apiController.update({ params: req.params, body: cleanData }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status >= 400) {
      throw new Error(result.data.message || 'Error al actualizar compra');
    }
    
    logger.info('Compra actualizada desde vista:', { id: req.params.id });
    res.redirect('/compras');
  } catch (error) {
    logger.error('Error al actualizar compra:', { error });
    const refData = await getReferenceData();
    res.render('compras/editar', {
      error: error.message,
      compra: { ...req.body, id: req.params.id },
      ...refData
    });
  }
};

export const handleDeleteCompra = async (req, res) => {
  try {
    // Usar el API controller para eliminar la compra
    const mockRes = createMockResponse();
    await apiController.delete({ params: req.params }, mockRes);
    const result = mockRes.getResult();
    
    if (result.status >= 400) {
      throw new Error(result.data.message || 'Error al eliminar compra');
    }
    
    logger.info('Compra eliminada desde vista:', { id: req.params.id });
    res.redirect('/compras');
  } catch (error) {
    logger.error('Error al eliminar compra:', { error });
    res.status(500).send('Error al eliminar la compra');
  }
};
