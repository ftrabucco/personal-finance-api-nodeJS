import Joi from 'joi';

const debitoAutomaticoSchema = Joi.object({
  descripcion: Joi.string()
    .trim()
    .required()
    .max(255)
    .messages({
      'string.empty': 'La descripción es requerida',
      'string.max': 'La descripción no puede exceder los 255 caracteres'
    }),
  
  monto: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.base': 'El monto debe ser un número',
      'number.empty': 'El monto es requerido',
      'number.min': 'El monto debe ser un número positivo'
    }),
  
  dia_de_pago: Joi.number()
    .integer()
    .required()
    .min(1)
    .max(31)
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.empty': 'El día de pago es requerido',
      'number.min': 'El día de pago debe ser un número entre 1 y 31',
      'number.max': 'El día de pago debe ser un número entre 1 y 31'
    }),
  
  categoria_gasto_id: Joi.number()
    .integer()
    .required()
    .min(1)
    .messages({
      'number.base': 'La categoría debe ser un número',
      'number.empty': 'La categoría es requerida',
      'number.min': 'La categoría debe ser un número válido'
    }),
  
  importancia_gasto_id: Joi.number()
    .integer()
    .required()
    .min(1)
    .messages({
      'number.base': 'La importancia debe ser un número',
      'number.empty': 'La importancia es requerida',
      'number.min': 'La importancia debe ser un número válido'
    }),
  
  tipo_pago_id: Joi.number()
    .integer()
    .required()
    .min(1)
    .messages({
      'number.base': 'El tipo de pago debe ser un número',
      'number.empty': 'El tipo de pago es requerido',
      'number.min': 'El tipo de pago debe ser un número válido'
    }),
  
  tarjeta_id: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.base': 'La tarjeta debe ser un número',
      'number.min': 'La tarjeta debe ser un número válido'
    })
});

export function validateCreateDebitoAutomatico(req, res, next) {
  const { error } = debitoAutomaticoSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      errors: error.details.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    });
  }
  next();
}

export function validateUpdateDebitoAutomatico(req, res, next) {
  const { error } = debitoAutomaticoSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      errors: error.details.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    });
  }
  next();
}
