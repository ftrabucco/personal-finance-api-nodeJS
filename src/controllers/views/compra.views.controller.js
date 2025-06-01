import { Compra, CategoriaGasto, ImportanciaGasto, Tarjeta, TipoPago } from '../../models/index.js';
import logger from '../../utils/logger.js';

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
    const {
      descripcion,
      monto_total,
      cantidad_cuotas,
      fecha_compra,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    // Validar campos requeridos
    if (!descripcion || !monto_total || !fecha_compra || !categoria_gasto_id || !importancia_gasto_id || !tipo_pago_id) {
      throw new Error('Todos los campos son requeridos excepto tarjeta');
    }

    // Validar que los IDs existan antes de crear
    const [categoria, importancia, tipoPago, tarjeta] = await Promise.all([
      CategoriaGasto.findByPk(categoria_gasto_id),
      ImportanciaGasto.findByPk(importancia_gasto_id),
      TipoPago.findByPk(tipo_pago_id),
      tarjeta_id ? Tarjeta.findByPk(tarjeta_id) : Promise.resolve(null)
    ]);

    if (!categoria) {
      throw new Error(`La categoría con ID ${categoria_gasto_id} no existe`);
    }
    if (!importancia) {
      throw new Error(`La importancia con ID ${importancia_gasto_id} no existe`);
    }
    if (!tipoPago) {
      throw new Error(`El tipo de pago con ID ${tipo_pago_id} no existe`);
    }
    if (tarjeta_id && !tarjeta) {
      throw new Error(`La tarjeta con ID ${tarjeta_id} no existe`);
    }

    const nuevaCompra = await Compra.create({
      descripcion,
      monto_total: parseFloat(monto_total),
      cantidad_cuotas: parseInt(cantidad_cuotas || 1),
      fecha_compra,
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Compra creada:', { id: nuevaCompra.id });
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
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      return res.status(404).send('Compra no encontrada');
    }

    const {
      descripcion,
      monto_total,
      cantidad_cuotas,
      fecha_compra,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    // Validar campos requeridos
    if (!descripcion || !monto_total || !fecha_compra || !categoria_gasto_id || !importancia_gasto_id || !tipo_pago_id) {
      throw new Error('Todos los campos son requeridos excepto tarjeta');
    }

    // Validar que los IDs existan antes de actualizar
    const [categoria, importancia, tipoPago, tarjeta] = await Promise.all([
      CategoriaGasto.findByPk(categoria_gasto_id),
      ImportanciaGasto.findByPk(importancia_gasto_id),
      TipoPago.findByPk(tipo_pago_id),
      tarjeta_id ? Tarjeta.findByPk(tarjeta_id) : Promise.resolve(null)
    ]);

    if (!categoria) {
      throw new Error(`La categoría con ID ${categoria_gasto_id} no existe`);
    }
    if (!importancia) {
      throw new Error(`La importancia con ID ${importancia_gasto_id} no existe`);
    }
    if (!tipoPago) {
      throw new Error(`El tipo de pago con ID ${tipo_pago_id} no existe`);
    }
    if (tarjeta_id && !tarjeta) {
      throw new Error(`La tarjeta con ID ${tarjeta_id} no existe`);
    }

    await compra.update({
      descripcion,
      monto_total: parseFloat(monto_total),
      cantidad_cuotas: parseInt(cantidad_cuotas || 1),
      fecha_compra,
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Compra actualizada:', { id: compra.id });
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
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      return res.status(404).send('Compra no encontrada');
    }
    await compra.destroy();
    logger.info('Compra eliminada:', { id: req.params.id });
    res.redirect('/compras');
  } catch (error) {
    logger.error('Error al eliminar compra:', { error });
    res.status(500).send('Error al eliminar la compra');
  }
};
