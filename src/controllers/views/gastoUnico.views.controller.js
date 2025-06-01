import { GastoUnico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';

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
    const {
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    logger.debug('Datos recibidos:', {
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    });

    // Validar que los IDs existan antes de crear
    const [categoria, importancia, tipoPago, tarjeta] = await Promise.all([
      CategoriaGasto.findByPk(categoria_gasto_id),
      ImportanciaGasto.findByPk(importancia_gasto_id),
      TipoPago.findByPk(tipo_pago_id),
      tarjeta_id ? Tarjeta.findByPk(tarjeta_id) : Promise.resolve(null)
    ]);

    logger.debug('Datos encontrados:', {
      categoria: categoria?.get(),
      importancia: importancia?.get(),
      tipoPago: tipoPago?.get(),
      tarjeta: tarjeta?.get()
    });

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

    const nuevoGasto = await GastoUnico.create({
      descripcion,
      monto: parseFloat(monto),
      fecha,
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    // Generar el gasto real inmediatamente
    await GastoGeneratorService.generateFromGastoUnico(nuevoGasto);

    logger.info('Gasto único creado y gasto real generado:', { id: nuevoGasto.id });
    res.redirect('/gastos-unicos');
  } catch (error) {
    logger.error('Error al crear gasto único:', { error });
    const refData = await getReferenceData();
    res.render('gastosUnicos/nuevo', { 
      ...refData, 
      error: error.message,
      formData: req.body // Mantener los datos del formulario
    });
  }
};

export const handleFormEditarGastoUnico = async (req, res) => {
  try {
    const gasto = await GastoUnico.findByPk(req.params.id);
    if (!gasto) {
      return res.status(404).send('Gasto único no encontrado');
    }

    const {
      descripcion,
      monto,
      fecha,
      categoria_gasto_id,
      importancia_gasto_id,
      tipo_pago_id,
      tarjeta_id
    } = req.body;

    // Validar campos requeridos
    if (!descripcion || !monto || !fecha || !categoria_gasto_id || !importancia_gasto_id || !tipo_pago_id) {
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

    await gasto.update({
      descripcion,
      monto: parseFloat(monto),
      fecha,
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Gasto único actualizado:', { id: gasto.id });
    res.redirect('/gastos-unicos');
  } catch (error) {
    logger.error('Error al actualizar gasto único:', { error });
    const refData = await getReferenceData();
    res.render('gastosUnicos/editar', {
      error: error.message,
      gasto: { ...req.body, id: req.params.id },
      ...refData
    });
  }
};

export const handleDeleteGastoUnico = async (req, res) => {
  try {
    const gasto = await GastoUnico.findByPk(req.params.id);
    if (!gasto) {
      return res.status(404).send('Gasto único no encontrado');
    }
    await gasto.destroy();
    logger.info('Gasto único eliminado:', { id: req.params.id });
    res.redirect('/gastos-unicos');
  } catch (error) {
    logger.error('Error al eliminar gasto único:', { error });
    res.status(500).send('Error al eliminar el gasto único');
  }
}; 