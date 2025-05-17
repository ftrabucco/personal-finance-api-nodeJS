import * as compraService from '../services/compra.service.js';

export async function crearCompra(req, res) {
  try {
    const nuevaCompra = await compraService.crearCompra(req.body);
    res.status(201).json(nuevaCompra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function obtenerCompras(req, res) {
  try {
    const compras = await compraService.obtenerCompras();
    res.json(compras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function obtenerCompraPorId(req, res) {
  try {
    const compra = await compraService.obtenerCompraPorId(req.params.id);
    if (compra) {
      res.json(compra);
    } else {
      res.status(404).json({ mensaje: 'Compra no encontrada' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function actualizarCompra(req, res) {
  try {
    const actualizada = await compraService.actualizarCompra(req.params.id, req.body);
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function eliminarCompra(req, res) {
  try {
    await compraService.eliminarCompra(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
