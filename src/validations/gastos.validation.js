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

export function validateGasto(data) {
  return gastoSchema.validate(data, { abortEarly: false }); // Muestra todos los errores
}