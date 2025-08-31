import Joi from 'joi';
import logger from '../utils/logger.js';

// Esquemas base reutilizables
const baseGastoSchema = {
  monto: Joi.number().positive().required()
    .messages({
      'number.base': 'El monto debe ser un número',
      'number.positive': 'El monto debe ser positivo',
      'any.required': 'El monto es requerido'
    }),
  
  descripcion: Joi.string().trim().min(3).max(255).required()
    .messages({
      'string.min': 'La descripción debe tener al menos 3 caracteres',
      'string.max': 'La descripción no puede exceder 255 caracteres',
      'any.required': 'La descripción es requerida'
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

  tarjeta_id: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'La tarjeta debe ser un número',
      'number.integer': 'La tarjeta debe ser un número entero',
      'number.positive': 'La tarjeta debe ser un ID válido'
    })
};

// Esquemas específicos por entidad
const compraSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  monto_total: Joi.number().positive().required()
    .messages({
      'number.base': 'El monto total debe ser un número',
      'number.positive': 'El monto total debe ser positivo',
      'any.required': 'El monto total es requerido'
    }),
  fecha_compra: Joi.date().iso().max('now').required()
    .messages({
      'date.base': 'La fecha de compra debe ser una fecha válida',
      'date.format': 'La fecha de compra debe estar en formato ISO',
      'date.max': 'La fecha de compra no puede ser futura',
      'any.required': 'La fecha de compra es requerida'
    }),
  cantidad_cuotas: Joi.number().integer().min(1).max(60).default(1)
    .messages({
      'number.base': 'La cantidad de cuotas debe ser un número',
      'number.integer': 'La cantidad de cuotas debe ser un número entero',
      'number.min': 'La cantidad de cuotas debe ser al menos 1',
      'number.max': 'La cantidad de cuotas no puede exceder 60'
    })
}).unknown(false);

const gastoRecurrenteSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  monto: baseGastoSchema.monto,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  dia_de_pago: Joi.number().integer().min(1).max(28).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 28 (para evitar problemas con febrero)',
      'any.required': 'El día de pago es requerido'
    }),
  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    }),
  fecha_inicio: Joi.date().iso().optional()
    .messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe estar en formato ISO'
    }),
  activo: Joi.boolean().default(true)
}).unknown(false);

const debitoAutomaticoSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  monto: baseGastoSchema.monto,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  dia_de_pago: Joi.number().integer().min(1).max(28).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 28 (para evitar problemas con febrero)',
      'any.required': 'El día de pago es requerido'
    }),
  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    }),
  activo: Joi.boolean().default(true)
}).unknown(false);

const gastoUnicoSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  monto: baseGastoSchema.monto,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  fecha: Joi.date().iso().max('now').required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'date.max': 'La fecha no puede ser futura',
      'any.required': 'La fecha es requerida'
    })
}).unknown(false);

// Esquemas para filtros y parámetros
const gastoFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  fecha_desde: Joi.date().iso().optional(),
  fecha_hasta: Joi.date().iso().min(Joi.ref('fecha_desde')).optional(),
  monto_min_ars: Joi.number().positive().optional(),
  monto_max_ars: Joi.number().positive().min(Joi.ref('monto_min_ars')).optional(),
  monto_min_usd: Joi.number().positive().optional(),
  monto_max_usd: Joi.number().positive().min(Joi.ref('monto_min_usd')).optional()
}).unknown(false);

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El ID debe ser un número',
      'number.integer': 'El ID debe ser un número entero',
      'number.positive': 'El ID debe ser un número válido',
      'any.required': 'El ID es requerido'
    })
}).unknown(false);

// Middleware genérico para validación
const createValidationMiddleware = (schema, location = 'body') => {
  return (req, res, next) => {
    const dataToValidate = location === 'body' ? req.body : 
                          location === 'query' ? req.query : 
                          location === 'params' ? req.params : {};
    
    const { error, value } = schema.validate(dataToValidate, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
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

    // Reemplazar los datos con los validados
    if (location === 'body') req.body = value;
    else if (location === 'query') req.query = value;
    else if (location === 'params') req.params = value;

    next();
  };
};

// Exportar middlewares de validación unificados
export const validateCreateCompra = createValidationMiddleware(compraSchema, 'body');
export const validateUpdateCompra = createValidationMiddleware(compraSchema, 'body');
export const validateCreateGastoRecurrente = createValidationMiddleware(gastoRecurrenteSchema, 'body');
export const validateUpdateGastoRecurrente = createValidationMiddleware(gastoRecurrenteSchema, 'body');
export const validateCreateDebitoAutomatico = createValidationMiddleware(debitoAutomaticoSchema, 'body');
export const validateUpdateDebitoAutomatico = createValidationMiddleware(debitoAutomaticoSchema, 'body');
export const validateCreateGastoUnico = createValidationMiddleware(gastoUnicoSchema, 'body');
export const validateUpdateGastoUnico = createValidationMiddleware(gastoUnicoSchema, 'body');
export const validateGastoFilters = createValidationMiddleware(gastoFiltersSchema, 'query');
export const validateIdParam = createValidationMiddleware(idParamSchema, 'params');
