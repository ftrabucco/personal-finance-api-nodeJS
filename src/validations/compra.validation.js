import Joi from 'joi';

export const createCompraSchema = Joi.object({
  descripcion: Joi.string().trim().min(3).max(255).required(),
  monto_total: Joi.number().positive().precision(2).required(),
  cantidad_cuotas: Joi.number().integer().min(1).max(60).default(1),
  fecha_compra: Joi.date().iso().max('now').required(),
  categoria_gasto_id: Joi.number().integer().positive().required(),
  importancia_gasto_id: Joi.number().integer().positive().required(),
  tipo_pago_id: Joi.number().integer().positive().required(),
  tarjeta_id: Joi.number().integer().positive().optional().allow(null),
  pendiente_cuotas: Joi.boolean().default(true)
});

export const updateCompraSchema = Joi.object({
  descripcion: Joi.string().trim().min(3).max(255),
  monto_total: Joi.number().positive().precision(2),
  cantidad_cuotas: Joi.number().integer().min(1).max(60),
  fecha_compra: Joi.date().iso().max('now'),
  categoria_gasto_id: Joi.number().integer().positive(),
  importancia_gasto_id: Joi.number().integer().positive(),
  tipo_pago_id: Joi.number().integer().positive(),
  tarjeta_id: Joi.number().integer().positive().allow(null),
  pendiente_cuotas: Joi.boolean()
});
