import Joi from 'joi';

export const createGastoUnicoSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().positive().required(),
  fecha: Joi.date().required(),
  categoria_gasto_id: Joi.number().integer().required(),
  importancia_gasto_id: Joi.number().integer().required(),
  tipo_pago_id: Joi.number().integer().required(),
  tarjeta_id: Joi.number().integer().allow(null).optional(),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  // Estos campos son calculados por el backend, no deben ser enviados:
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden()
});

export const updateGastoUnicoSchema = Joi.object({
  descripcion: Joi.string(),
  monto: Joi.number().positive(),
  fecha: Joi.date(),
  categoria_gasto_id: Joi.number().integer(),
  importancia_gasto_id: Joi.number().integer(),
  tipo_pago_id: Joi.number().integer(),
  tarjeta_id: Joi.number().integer().allow(null).optional(),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD'),
  // Estos campos son calculados por el backend:
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden()
});
