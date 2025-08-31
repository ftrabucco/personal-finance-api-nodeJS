import Joi from 'joi';

export const createCompraSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto_total: Joi.number().positive().required(),
  cantidad_cuotas: Joi.number().integer().min(1).required(),
  fecha_compra: Joi.date().iso().required(),
  categoria_gasto_id: Joi.number().integer().required(),
  importancia_gasto_id: Joi.number().integer().required(),
  tipo_pago_id: Joi.number().integer().required(),
  tarjeta_id: Joi.number().integer()
});

export const updateCompraSchema = Joi.object({
  descripcion: Joi.string(),
  monto_total: Joi.number().positive(),
  cantidad_cuotas: Joi.number().integer().min(1),
  fecha_compra: Joi.date().iso(),
  categoria_gasto_id: Joi.number().integer(),
  importancia_gasto_id: Joi.number().integer(),
  tipo_pago_id: Joi.number().integer(),
  tarjeta_id: Joi.number().integer()
});
