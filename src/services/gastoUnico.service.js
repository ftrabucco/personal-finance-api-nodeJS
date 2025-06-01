import { GastoUnico } from '../models/index.js';

export const GastoUnicoService = {
  async create(data) {
    return await GastoUnico.create(data);
  },
  async findAll() {
    return await GastoUnico.findAll();
  },
  async findById(id) {
    return await GastoUnico.findByPk(id);
  },
  async update(id, data) {
    const record = await GastoUnico.findByPk(id);
    if (!record) return null;
    return await record.update(data);
  },
  async delete(id) {
    const record = await GastoUnico.findByPk(id);
    if (!record) return null;
    await record.destroy();
    return record;
  }
};
