import Joi from 'joi';

// Nota: Los gastos de la tabla "gastos" generalmente se crean automáticamente
// desde las estrategias de generación (no directamente por el usuario).
// Esta validación es para casos donde se creen gastos manualmente.

export const gastoSchema = Joi.object({
  fecha: Joi.date().iso().required(),
  // Para crear gasto manual: se puede especificar monto_ars directamente
  // O dejar que el sistema lo calcule desde la entidad origen
  monto_ars: Joi.number().positive().optional(),
  monto_usd: Joi.number().positive().optional(),
  descripcion: Joi.string().max(255).required(),
  categoria_gasto_id: Joi.number().integer().positive().required(),
  frecuencia_gasto_id: Joi.number().integer().positive(),
  tipo_pago_id: Joi.number().integer().positive(),
  importancia_gasto_id: Joi.number().integer().positive().required(),
  tipo_origen: Joi.string().valid('recurrente', 'debito_automatico', 'compra', 'unico').required(),
  id_origen: Joi.number().integer().positive().required(),
  // 💱 Multi-currency fields (readonly - generalmente vienen de estrategias)
  moneda_origen: Joi.string().valid('ARS', 'USD').optional(),
  tipo_cambio_usado: Joi.number().positive().optional()
});

export const getGastosSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive(),
  frecuencia_gasto_id: Joi.number().integer().positive(),
  tipo_pago_id: Joi.number().integer().positive(),
  importancia_gasto_id: Joi.number().integer().positive(),
  tarjeta_id: Joi.number().integer().positive(),
  tipo_origen: Joi.string().valid('recurrente', 'debito_automatico', 'compra', 'unico'),
  id_origen: Joi.number().integer().positive(),
  fecha_desde: Joi.date().iso(),
  fecha_hasta: Joi.date().iso(),
  monto_min_ars: Joi.number().positive(),
  monto_max_ars: Joi.number().positive(),
  monto_min_usd: Joi.number().positive(),
  monto_max_usd: Joi.number().positive(),
  limit: Joi.number().integer().min(1).max(1000),
  offset: Joi.number().integer().min(0),
  orderBy: Joi.string().valid('fecha', 'monto_ars', 'monto_usd', 'descripcion', 'createdAt'),
  orderDirection: Joi.string().valid('ASC', 'DESC')
});

export const gastoPutSchema = Joi.object({
  fecha: Joi.date().iso().optional(),
  monto_ars: Joi.number().positive().optional(),
  monto_usd: Joi.number().positive().optional(),
  descripcion: Joi.string().max(255).optional(),
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').optional(),
  tipo_cambio_usado: Joi.number().positive().optional()
});

export const paramGastoIdschema = Joi.object({
  id: Joi.number().integer().positive().required()
});

export function validateGasto(data) {
  return gastoSchema.validate(data, { abortEarly: false }); // Muestra todos los errores
}

export function validateGetGastos(data){
  return getGastosSchema.validate(data, { abortEarly: false });
}

export function validatePutGasto(data) {
  return gastoPutSchema.validate(data, { abortEarly: false }); // Muestra todos los errores
}

export function validateParamGastoId(data){
  return paramGastoIdschema.validate(data, { abortEarly: false });
}
