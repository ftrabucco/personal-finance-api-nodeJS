import { createGastoUnicoSchema, updateGastoUnicoSchema } from '../validations/gastoUnico.validation.js';

export function validateCreateGastoUnico(req, res, next) {
  const { error } = createGastoUnicoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}

export function validateUpdateGastoUnico(req, res, next) {
  const { error } = updateGastoUnicoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}
