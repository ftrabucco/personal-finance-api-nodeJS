import Joi from 'joi';

export const createDebitoAutomaticoSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().positive().required(),
  dia_pago: Joi.number().min(1).max(31).required(),
  categoria_id: Joi.number().integer().required(),
  importancia_id: Joi.number().integer().required(),
  tipo_pago_id: Joi.number().integer().required(),
});

export const updateDebitoAutomaticoSchema = Joi.object({
  descripcion: Joi.string(),
  monto: Joi.number().positive(),
  dia_pago: Joi.number().min(1).max(31),
  categoria_id: Joi.number().integer(),
  importancia_id: Joi.number().integer(),
  tipo_pago_id: Joi.number().integer(),
});
