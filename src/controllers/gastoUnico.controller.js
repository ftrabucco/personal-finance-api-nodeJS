import { GastoUnicoService } from '../services/gastoUnico.service.js';

export const GastoUnicoController = {
  async create(req, res) {
    const record = await GastoUnicoService.create(req.body);
    res.status(201).json(record);
  },
  async getAll(req, res) {
    const data = await GastoUnicoService.findAll();
    res.json(data);
  },
  async getById(req, res) {
    const record = await GastoUnicoService.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'No encontrado' });
    res.json(record);
  },
  async update(req, res) {
    const updated = await GastoUnicoService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  },
  async delete(req, res) {
    const deleted = await GastoUnicoService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'No encontrado' });
    res.json(deleted);
  }
};
