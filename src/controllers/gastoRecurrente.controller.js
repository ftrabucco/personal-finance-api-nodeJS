import { GastoRecurrenteService } from '../services/gastoRecurrente.service.js';

export const GastoRecurrenteController = {
  async create(req, res) {
    const record = await GastoRecurrenteService.create(req.body);
    res.status(201).json(record);
  },
  async getAll(req, res) {
    const data = await GastoRecurrenteService.findAll();
    res.json(data);
  },
  async getById(req, res) {
    const record = await GastoRecurrenteService.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'No encontrado' });
    res.json(record);
  },
  async update(req, res) {
    const updated = await GastoRecurrenteService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  },
  async delete(req, res) {
    const deleted = await GastoRecurrenteService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'No encontrado' });
    res.json(deleted);
  }
};
