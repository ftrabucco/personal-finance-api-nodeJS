import { createGastoRecurrenteSchema, updateGastoRecurrenteSchema } from '../validations/gastoRecurrente.validation.js';

export function validateCreateGastoRecurrente(req, res, next) {
  const { error } = createGastoRecurrenteSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}

export function validateUpdateGastoRecurrente(req, res, next) {
  const { error } = updateGastoRecurrenteSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}
