import Joi from 'joi';

export const createGastoRecurrenteSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().positive().required(),
  frecuencia: Joi.string().valid('mensual', 'semanal', 'diaria').required(),
  categoria_id: Joi.number().integer().required(),
  importancia_id: Joi.number().integer().required(),
  tipo_pago_id: Joi.number().integer().required(),
});

export const updateGastoRecurrenteSchema = Joi.object({
  descripcion: Joi.string(),
  monto: Joi.number().positive(),
  frecuencia: Joi.string().valid('mensual', 'semanal', 'diaria'),
  categoria_id: Joi.number().integer(),
  importancia_id: Joi.number().integer(),
  tipo_pago_id: Joi.number().integer(),
});
