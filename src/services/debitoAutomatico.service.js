import { DebitoAutomatico } from '../models/index.js';

export const DebitoAutomaticoService = {
  async create(data) {
    return await DebitoAutomatico.create(data);
  },
  async findAll() {
    return await DebitoAutomatico.findAll();
  },
  async findById(id) {
    return await DebitoAutomatico.findByPk(id);
  },
  async update(id, data) {
    const record = await DebitoAutomatico.findByPk(id);
    if (!record) return null;
    return await record.update(data);
  },
  async delete(id) {
    const record = await DebitoAutomatico.findByPk(id);
    if (!record) return null;
    await record.destroy();
    return record;
  }
};
