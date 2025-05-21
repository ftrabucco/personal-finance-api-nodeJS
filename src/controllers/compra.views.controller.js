import { Compra } from '../models/index.js'; // o tu ruta real

export const renderListaCompras = async (req, res) => {
  const compras = await Compra.findAll({ order: [['fecha_compra', 'DESC']] });
  console.log(JSON.stringify(compras, null, 2));
  res.render('compras/lista', { compras });
};

export const renderFormNuevaCompra = (req, res) => {
  res.render('compras/nueva');
};

export const handleFormNuevaCompra = async (req, res) => {
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

  await Compra.create({
    descripcion,
    monto_total,
    cantidad_cuotas,
    fecha_compra,
    categoria_gasto_id,
    importancia_gasto_id,
    tipo_pago_id,
    tarjeta_id
  });

  res.redirect('/compras/vista');
};
