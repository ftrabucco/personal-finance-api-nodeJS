import Joi from 'joi';

export const createGastoRecurrenteSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().positive().required(),
  dia_de_pago: Joi.number().integer().min(1).max(31).required(),
  fecha_inicio: Joi.date().iso().required(),
  frecuencia_gasto_id: Joi.number().integer().positive().required(),
  categoria_gasto_id: Joi.number().integer().positive().required(),
  importancia_gasto_id: Joi.number().integer().positive().required(),
  tipo_pago_id: Joi.number().integer().positive().required(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  activo: Joi.boolean().default(true)
});

export const updateGastoRecurrenteSchema = Joi.object({
  descripcion: Joi.string(),
  monto: Joi.number().positive(),
  dia_de_pago: Joi.number().integer().min(1).max(31),
  fecha_inicio: Joi.date().iso(),
  frecuencia_gasto_id: Joi.number().integer().positive(),
  categoria_gasto_id: Joi.number().integer().positive(),
  importancia_gasto_id: Joi.number().integer().positive(),
  tipo_pago_id: Joi.number().integer().positive(),
  tarjeta_id: Joi.number().integer().positive(),
  activo: Joi.boolean()
});
