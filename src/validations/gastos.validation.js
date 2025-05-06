import Joi from 'joi';

export const gastoSchema = Joi.object({
    fecha: Joi.date().iso().required(),
    monto_ars: Joi.number().positive().required(),
    monto_usd: Joi.number(),
    descripcion: Joi.string().max(255).required(),
    categoria_gasto_id: Joi.number().integer().positive().required(),
    frecuencia_gasto_id: Joi.number().integer().positive().required(),
    tipo_pago_id: Joi.number().integer().positive().required(),
    importancia_gasto_id: Joi.number().integer().positive().required()
})

export const getGastosSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive(),
  frecuencia_gasto_id: Joi.number().integer().positive(),
  tipo_pago_id: Joi.number().integer().positive(),
  importancia_gasto_id: Joi.number().integer().positive(),
  monto_min_ars: Joi.number().positive(),
  monto_max_ars: Joi.number().positive()
})

export const gastoPutSchema = Joi.object({
  fecha: Joi.date().iso().optional(),
  monto_ars: Joi.number().positive().optional(),
  monto_usd: Joi.number(),
  descripcion: Joi.string().max(255).optional(),
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional()
})

export const paramGastoIdschema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export function validateGasto(data) {
  return gastoSchema.validate(data, { abortEarly: false }); // Muestra todos los errores
}

export function validateGetGastos(data){
  return getGastosSchema.validate(data, { abortEarly: false })
}

export function validatePutGasto(data) {
  return gastoPutSchema.validate(data, { abortEarly: false }); // Muestra todos los errores
}

export function validateParamGastoId(data){
  return paramGastoIdschema.validate(data, { abortEarly: false })
}