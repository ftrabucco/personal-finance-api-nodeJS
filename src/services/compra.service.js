import { Compra } from '../models/index.js'; // o como estés importando

export async function crearCompra(data) {
  return Compra.create(data);
}

export async function obtenerCompras() {
  return Compra.findAll();
}

export async function obtenerCompraPorId(id) {
  return Compra.findByPk(id);
}

export async function actualizarCompra(id, data) {
  const compra = await Compra.findByPk(id);
  if (!compra) throw new Error('Compra no encontrada');
  return compra.update(data);
}

export async function eliminarCompra(id) {
  const compra = await Compra.findByPk(id);
  if (!compra) throw new Error('Compra no encontrada');
  return compra.destroy();
}
