import { GastoRecurrente } from '../models/index.js';

export const GastoRecurrenteService = {
  async create(data) {
    return await GastoRecurrente.create(data);
  },
  async findAll() {
    return await GastoRecurrente.findAll();
  },
  async findById(id) {
    return await GastoRecurrente.findByPk(id);
  },
  async update(id, data) {
    const record = await GastoRecurrente.findByPk(id);
    if (!record) return null;
    return await record.update(data);
  },
  async delete(id) {
    const record = await GastoRecurrente.findByPk(id);
    if (!record) return null;
    await record.destroy();
    return record;
  }
};
