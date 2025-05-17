import { DebitoAutomaticoService } from '../services/debitoAutomatico.service.js';

export const DebitoAutomaticoController = {
  async create(req, res) {
    const record = await DebitoAutomaticoService.create(req.body);
    res.status(201).json(record);
  },
  async getAll(req, res) {
    const data = await DebitoAutomaticoService.findAll();
    res.json(data);
  },
  async getById(req, res) {
    const record = await DebitoAutomaticoService.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'No encontrado' });
    res.json(record);
  },
  async update(req, res) {
    const updated = await DebitoAutomaticoService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  },
  async delete(req, res) {
    const deleted = await DebitoAutomaticoService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'No encontrado' });
    res.json(deleted);
  }
};
