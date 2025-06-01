import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import logger from '../../utils/logger.js';

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
    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    logger.debug('Datos recibidos:', {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    // Validar que los IDs existan antes de crear
    const [categoria, importancia, frecuencia, tipoPago, tarjeta] = await Promise.all([
      CategoriaGasto.findByPk(categoria_gasto_id),
      ImportanciaGasto.findByPk(importancia_gasto_id),
      FrecuenciaGasto.findByPk(frecuencia_gasto_id),
      TipoPago.findByPk(tipo_pago_id),
      tarjeta_id ? Tarjeta.findByPk(tarjeta_id) : Promise.resolve(null)
    ]);

    if (!categoria) {
      throw new Error(`La categoría con ID ${categoria_gasto_id} no existe`);
    }
    if (!importancia) {
      throw new Error(`La importancia con ID ${importancia_gasto_id} no existe`);
    }
    if (!frecuencia) {
      throw new Error(`La frecuencia con ID ${frecuencia_gasto_id} no existe`);
    }
    if (!tipoPago) {
      throw new Error(`El tipo de pago con ID ${tipo_pago_id} no existe`);
    }
    if (tarjeta_id && !tarjeta) {
      throw new Error(`La tarjeta con ID ${tarjeta_id} no existe`);
    }

    const nuevoDebito = await DebitoAutomatico.create({
      descripcion,
      monto: parseFloat(monto),
      dia_de_pago: parseInt(dia_de_pago),
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      frecuencia_gasto_id: parseInt(frecuencia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Débito automático creado:', { id: nuevoDebito.id });
    res.redirect('/debitos-automaticos');
  } catch (error) {
    logger.error('Error al crear débito automático:', { error });
    const refData = await getReferenceData();
    res.render('debitosAutomaticos/nuevo', {
      ...refData,
      error: error.message,
      formData: req.body // Mantener los datos del formulario
    });
  }
};

export const handleFormEditarDebitoAutomatico = async (req, res) => {
  try {
    const debito = await DebitoAutomatico.findByPk(req.params.id);
    if (!debito) {
      return res.status(404).send('Débito automático no encontrado');
    }

    const {
      descripcion,
      monto,
      dia_de_pago,
      categoria_gasto_id,
      importancia_gasto_id,
      frecuencia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    // Validar campos requeridos
    if (!descripcion || !monto || !dia_de_pago || !categoria_gasto_id || !importancia_gasto_id || !frecuencia_gasto_id || !tipo_pago_id) {
      throw new Error('Todos los campos son requeridos excepto tarjeta');
    }

    // Validar que los IDs existan antes de actualizar
    const [categoria, importancia, frecuencia, tipoPago, tarjeta] = await Promise.all([
      CategoriaGasto.findByPk(categoria_gasto_id),
      ImportanciaGasto.findByPk(importancia_gasto_id),
      FrecuenciaGasto.findByPk(frecuencia_gasto_id),
      TipoPago.findByPk(tipo_pago_id),
      tarjeta_id ? Tarjeta.findByPk(tarjeta_id) : Promise.resolve(null)
    ]);

    if (!categoria) {
      throw new Error(`La categoría con ID ${categoria_gasto_id} no existe`);
    }
    if (!importancia) {
      throw new Error(`La importancia con ID ${importancia_gasto_id} no existe`);
    }
    if (!frecuencia) {
      throw new Error(`La frecuencia con ID ${frecuencia_gasto_id} no existe`);
    }
    if (!tipoPago) {
      throw new Error(`El tipo de pago con ID ${tipo_pago_id} no existe`);
    }
    if (tarjeta_id && !tarjeta) {
      throw new Error(`La tarjeta con ID ${tarjeta_id} no existe`);
    }

    await debito.update({
      descripcion,
      monto: parseFloat(monto),
      dia_de_pago: parseInt(dia_de_pago),
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      frecuencia_gasto_id: parseInt(frecuencia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Débito automático actualizado:', { id: debito.id });
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
    const debito = await DebitoAutomatico.findByPk(req.params.id);
    if (!debito) {
      return res.status(404).send('Débito automático no encontrado');
    }
    await debito.destroy();
    logger.info('Débito automático eliminado:', { id: req.params.id });
    res.redirect('/debitos-automaticos');
  } catch (error) {
    logger.error('Error al eliminar débito automático:', { error });
    res.status(500).send('Error al eliminar el débito automático');
  }
}; 