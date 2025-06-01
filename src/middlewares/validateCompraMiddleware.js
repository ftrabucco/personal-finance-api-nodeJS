import { createCompraSchema, updateCompraSchema } from '../validations/compra.validation.js';

export function validateCreateCompra(req, res, next) {
  const { error } = createCompraSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}

export function validateUpdateCompra(req, res, next) {
  const { error } = updateCompraSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
}
