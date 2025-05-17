import { createDebitoAutomaticoSchema, updateDebitoAutomaticoSchema } from '../validations/debitoAutomatico.validation.js';

export function validateCreateDebitoAutomatico(req, res, next) {
  const { error } = createDebitoAutomaticoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}

export function validateUpdateDebitoAutomatico(req, res, next) {
  const { error } = updateDebitoAutomaticoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}
