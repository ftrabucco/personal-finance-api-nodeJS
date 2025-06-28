import Joi from 'joi';
import logger from '../utils/logger.js';

// Esquemas de validación con Joi
const commonGastoSchema = Joi.object({
  monto: Joi.number().positive().required()
    .messages({
      'number.base': 'El monto debe ser un número',
      'number.positive': 'El monto debe ser positivo',
      'any.required': 'El monto es requerido'
    }),
  
  descripcion: Joi.string().trim().min(3).max(255).optional()
    .messages({
      'string.min': 'La descripción debe tener al menos 3 caracteres',
      'string.max': 'La descripción no puede exceder 255 caracteres'
    }),

  categoria_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La categoría debe ser un número',
      'number.integer': 'La categoría debe ser un número entero',
      'number.positive': 'La categoría debe ser un ID válido',
      'any.required': 'La categoría es requerida'
    }),

  importancia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La importancia debe ser un número',
      'number.integer': 'La importancia debe ser un número entero',
      'number.positive': 'La importancia debe ser un ID válido',
      'any.required': 'La importancia es requerida'
    }),

  tipo_pago_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El tipo de pago debe ser un número',
      'number.integer': 'El tipo de pago debe ser un número entero',
      'number.positive': 'El tipo de pago debe ser un ID válido',
      'any.required': 'El tipo de pago es requerido'
    }),

  tarjeta_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'La tarjeta debe ser un número',
      'number.integer': 'La tarjeta debe ser un número entero',
      'number.positive': 'La tarjeta debe ser un ID válido'
    })
});

// Esquema para Compra
const compraSchema = commonGastoSchema.keys({
  fecha: Joi.date().iso().required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'any.required': 'La fecha es requerida'
    }),
  
  cantidad_cuotas: Joi.number().integer().min(1).max(60).optional()
    .messages({
      'number.base': 'La cantidad de cuotas debe ser un número',
      'number.integer': 'La cantidad de cuotas debe ser un número entero',
      'number.min': 'La cantidad de cuotas debe ser al menos 1',
      'number.max': 'La cantidad de cuotas no puede exceder 60'
    })
});

// Esquema para GastoRecurrente
const gastoRecurrenteSchema = commonGastoSchema.keys({
  dia_de_pago: Joi.number().integer().min(1).max(31).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 31',
      'any.required': 'El día de pago es requerido'
    }),

  fecha_inicio: Joi.date().iso().required()
    .messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe estar en formato ISO',
      'any.required': 'La fecha de inicio es requerida'
    }),

  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    })
});

// Esquema para DebitoAutomatico
const debitoAutomaticoSchema = commonGastoSchema.keys({
  dia_de_pago: Joi.number().integer().min(1).max(31).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 31',
      'any.required': 'El día de pago es requerido'
    }),

  fecha_inicio: Joi.date().iso().required()
    .messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe estar en formato ISO',
      'any.required': 'La fecha de inicio es requerida'
    }),

  servicio: Joi.string().trim().min(3).max(100).required()
    .messages({
      'string.min': 'El nombre del servicio debe tener al menos 3 caracteres',
      'string.max': 'El nombre del servicio no puede exceder 100 caracteres',
      'any.required': 'El nombre del servicio es requerido'
    }),

  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    })
});

// Esquema para GastoUnico
const gastoUnicoSchema = commonGastoSchema.keys({
  fecha: Joi.date().iso().required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'any.required': 'La fecha es requerida'
    })
});

// Esquema para filtros de búsqueda
const filtrosSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'La categoría debe ser un número',
      'number.integer': 'La categoría debe ser un número entero',
      'number.positive': 'La categoría debe ser un ID válido'
    }),

  importancia_gasto_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'La importancia debe ser un número',
      'number.integer': 'La importancia debe ser un número entero',
      'number.positive': 'La importancia debe ser un ID válido'
    }),

  tipo_pago_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'El tipo de pago debe ser un número',
      'number.integer': 'El tipo de pago debe ser un número entero',
      'number.positive': 'El tipo de pago debe ser un ID válido'
    }),

  fecha_desde: Joi.date().iso().optional()
    .messages({
      'date.base': 'La fecha desde debe ser una fecha válida',
      'date.format': 'La fecha desde debe estar en formato ISO'
    }),

  fecha_hasta: Joi.date().iso().optional()
    .messages({
      'date.base': 'La fecha hasta debe ser una fecha válida',
      'date.format': 'La fecha hasta debe estar en formato ISO'
    }),

  monto_min_ars: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto mínimo en ARS debe ser un número',
      'number.positive': 'El monto mínimo en ARS debe ser positivo'
    }),

  monto_max_ars: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto máximo en ARS debe ser un número',
      'number.positive': 'El monto máximo en ARS debe ser positivo'
    }),

  monto_min_usd: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto mínimo en USD debe ser un número',
      'number.positive': 'El monto mínimo en USD debe ser positivo'
    }),

  monto_max_usd: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto máximo en USD debe ser un número',
      'number.positive': 'El monto máximo en USD debe ser positivo'
    })
});

// Esquema para parámetros de ruta (IDs)
const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El ID debe ser un número',
      'number.integer': 'El ID debe ser un número entero',
      'number.positive': 'El ID debe ser un número válido',
      'any.required': 'El ID es requerido'
    })
});

// Middleware genérico para validación con Joi
const validateWithJoi = (schema, location = 'body') => {
  return (req, res, next) => {
    const dataToValidate = location === 'body' ? req.body : 
                          location === 'query' ? req.query : 
                          location === 'params' ? req.params : {};
    
    const { error, value } = schema.validate(dataToValidate, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Errores de validación:', { 
        path: req.path, 
        method: req.method,
        errors: validationErrors 
      });

      return res.status(400).json({
        error: 'Error de validación',
        details: validationErrors
      });
    }

    // Reemplazar los datos con los validados (sin campos desconocidos)
    if (location === 'body') req.body = value;
    else if (location === 'query') req.query = value;
    else if (location === 'params') req.params = value;

    next();
  };
};

// Exportar middlewares de validación
export const validateCreateCompra = validateWithJoi(compraSchema, 'body');
export const validateCreateGastoRecurrente = validateWithJoi(gastoRecurrenteSchema, 'body');
export const validateCreateDebitoAutomatico = validateWithJoi(debitoAutomaticoSchema, 'body');
export const validateCreateGastoUnico = validateWithJoi(gastoUnicoSchema, 'body');
export const validateGastoFilters = validateWithJoi(filtrosSchema, 'query');
export const validateIdParam = validateWithJoi(idParamSchema, 'params'); 