import Joi from 'joi';

export const createGastoUnicoSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().positive().required(),
  fecha: Joi.date().required(),
  categoria_gasto_id: Joi.number().integer().required(),
  importancia_gasto_id: Joi.number().integer().required(),
  tipo_pago_id: Joi.number().integer().required(),
});

export const updateGastoUnicoSchema = Joi.object({
  descripcion: Joi.string(),
  monto: Joi.number().positive(),
  fecha: Joi.date(),
  categoria_id: Joi.number().integer(),
  importancia_id: Joi.number().integer(),
  tipo_pago_id: Joi.number().integer(),
});
