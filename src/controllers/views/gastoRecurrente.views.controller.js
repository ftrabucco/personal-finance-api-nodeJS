import { GastoRecurrente, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
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

    logger.debug('Datos encontrados:', {
      categoria: categoria?.get(),
      importancia: importancia?.get(),
      frecuencia: frecuencia?.get(),
      tipoPago: tipoPago?.get(),
      tarjeta: tarjeta?.get()
    });

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

    const nuevoGasto = await GastoRecurrente.create({
      descripcion,
      monto: parseFloat(monto),
      dia_de_pago: parseInt(dia_de_pago),
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      frecuencia_gasto_id: parseInt(frecuencia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Gasto recurrente creado:', { id: nuevoGasto.id });
    res.redirect('/gastos-recurrentes');
  } catch (error) {
    logger.error('Error al crear gasto recurrente:', { error });
    const refData = await getReferenceData();
    res.render('gastosRecurrentes/nuevo', { 
      ...refData, 
      error: error.message,
      formData: req.body // Mantener los datos del formulario
    });
  }
};

export const handleFormEditarGastoRecurrente = async (req, res) => {
  try {
    const gasto = await GastoRecurrente.findByPk(req.params.id);
    if (!gasto) {
      return res.status(404).send('Gasto recurrente no encontrado');
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

    await gasto.update({
      descripcion,
      monto: parseFloat(monto),
      dia_de_pago: parseInt(dia_de_pago),
      categoria_gasto_id: parseInt(categoria_gasto_id),
      importancia_gasto_id: parseInt(importancia_gasto_id),
      frecuencia_gasto_id: parseInt(frecuencia_gasto_id),
      tipo_pago_id: parseInt(tipo_pago_id),
      tarjeta_id: tarjeta_id ? parseInt(tarjeta_id) : null
    });

    logger.info('Gasto recurrente actualizado:', { id: gasto.id });
    res.redirect('/gastos-recurrentes');
  } catch (error) {
    logger.error('Error al actualizar gasto recurrente:', { error });
    const refData = await getReferenceData();
    res.render('gastosRecurrentes/editar', {
      error: 'Error al actualizar el gasto recurrente',
      gasto: { ...req.body, id: req.params.id },
      ...refData
    });
  }
};

export const handleDeleteGastoRecurrente = async (req, res) => {
  try {
    const gasto = await GastoRecurrente.findByPk(req.params.id);
    if (!gasto) {
      return res.status(404).send('Gasto recurrente no encontrado');
    }
    await gasto.destroy();
    logger.info('Gasto recurrente eliminado:', { id: req.params.id });
    res.redirect('/gastos-recurrentes');
  } catch (error) {
    logger.error('Error al eliminar gasto recurrente:', { error });
    res.status(500).send('Error al eliminar el gasto recurrente');
  }
}; 