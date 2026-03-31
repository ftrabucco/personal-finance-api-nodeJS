import Joi from 'joi';
import logger from '../utils/logger.js';
import { sendValidationError } from '../utils/responseHelper.js';

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
    }),
  cuotas_pagadas: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Las cuotas pagadas deben ser un número',
      'number.integer': 'Las cuotas pagadas deben ser un número entero',
      'number.min': 'Las cuotas pagadas no pueden ser negativas'
    }),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_total_ars: Joi.forbidden(),
  monto_total_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden()
}).unknown(false);

const gastoRecurrenteSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  monto: baseGastoSchema.monto,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  dia_de_pago: Joi.number().integer().min(1).max(31).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 31',
      'any.required': 'El día de pago es requerido'
    }),
  mes_de_pago: Joi.number().integer().min(1).max(12).optional().allow(null)
    .messages({
      'number.base': 'El mes de pago debe ser un número',
      'number.integer': 'El mes de pago debe ser un número entero',
      'number.min': 'El mes de pago debe ser al menos 1',
      'number.max': 'El mes de pago no puede exceder 12'
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
  activo: Joi.boolean().default(true),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_referencia: Joi.forbidden()
}).unknown(false);

const debitoAutomaticoSchema = Joi.object({
  descripcion: baseGastoSchema.descripcion,
  monto: baseGastoSchema.monto,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  tipo_pago_id: baseGastoSchema.tipo_pago_id,
  tarjeta_id: baseGastoSchema.tarjeta_id,
  cuenta_bancaria_id: Joi.number().integer().positive().allow(null).optional()
    .messages({
      'number.base': 'La cuenta bancaria debe ser un número',
      'number.integer': 'La cuenta bancaria debe ser un número entero',
      'number.positive': 'La cuenta bancaria debe ser un ID válido'
    }),
  // dia_de_pago is optional when using credit card (uses card's due date)
  dia_de_pago: Joi.number().integer().min(1).max(31).allow(null)
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 31'
    }),
  // usa_vencimiento_tarjeta: when true, ignores dia_de_pago and uses credit card due date
  usa_vencimiento_tarjeta: Joi.boolean().default(false),
  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    }),
  activo: Joi.boolean().default(true),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_referencia: Joi.forbidden()
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
    }),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden()
}).unknown(false);

const gastoUnicoFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  fecha_desde: Joi.date().iso().optional(),
  fecha_hasta: Joi.date().iso().min(Joi.ref('fecha_desde')).optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  procesado: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('fecha', 'monto', 'descripcion', 'createdAt', 'updatedAt').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

const compraFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  fecha_desde: Joi.date().iso().optional(),
  fecha_hasta: Joi.date().iso().min(Joi.ref('fecha_desde')).optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  pendiente_cuotas: Joi.boolean().optional(),
  cuotas_min: Joi.number().integer().min(1).optional(),
  cuotas_max: Joi.number().integer().min(Joi.ref('cuotas_min')).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('fecha_compra', 'monto_total', 'descripcion', 'cantidad_cuotas', 'createdAt', 'updatedAt').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

const gastoRecurrenteFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  activo: Joi.boolean().optional(),
  dia_de_pago: Joi.number().integer().min(1).max(31).optional(),
  mes_de_pago: Joi.number().integer().min(1).max(12).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('monto', 'descripcion', 'dia_de_pago', 'mes_de_pago', 'activo', 'createdAt', 'updatedAt').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

const debitoAutomaticoFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  cuenta_bancaria_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  activo: Joi.boolean().optional(),
  dia_de_pago: Joi.number().integer().min(1).max(31).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('monto', 'descripcion', 'dia_de_pago', 'activo', 'createdAt', 'updatedAt').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

const gastoSchema = Joi.object({
  fecha: Joi.date().iso().max('now').required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'date.max': 'La fecha no puede ser futura',
      'any.required': 'La fecha es requerida'
    }),
  monto_ars: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto ARS debe ser un número',
      'number.positive': 'El monto ARS debe ser positivo'
    }),
  monto_usd: Joi.number().positive().optional()
    .messages({
      'number.base': 'El monto USD debe ser un número',
      'number.positive': 'El monto USD debe ser positivo'
    }),
  descripcion: baseGastoSchema.descripcion,
  categoria_gasto_id: baseGastoSchema.categoria_gasto_id,
  importancia_gasto_id: baseGastoSchema.importancia_gasto_id,
  frecuencia_gasto_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido'
    }),
  cantidad_cuotas_totales: Joi.number().integer().min(1).max(60).optional()
    .messages({
      'number.base': 'Las cuotas totales deben ser un número',
      'number.integer': 'Las cuotas totales deben ser un número entero',
      'number.min': 'Las cuotas totales deben ser al menos 1',
      'number.max': 'Las cuotas totales no pueden exceder 60'
    }),
  cantidad_cuotas_pagadas: Joi.number().integer().min(0).optional()
    .when('cantidad_cuotas_totales', {
      is: Joi.exist(),
      then: Joi.number().max(Joi.ref('cantidad_cuotas_totales'))
    })
    .messages({
      'number.base': 'Las cuotas pagadas deben ser un número',
      'number.integer': 'Las cuotas pagadas deben ser un número entero',
      'number.min': 'Las cuotas pagadas no pueden ser negativas',
      'number.max': 'Las cuotas pagadas no pueden exceder las cuotas totales'
    }),
  tipo_pago_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'El tipo de pago debe ser un número',
      'number.integer': 'El tipo de pago debe ser un número entero',
      'number.positive': 'El tipo de pago debe ser un ID válido'
    }),
  tarjeta_id: baseGastoSchema.tarjeta_id,
  usuario_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'El usuario debe ser un número',
      'number.integer': 'El usuario debe ser un número entero',
      'number.positive': 'El usuario debe ser un ID válido'
    }),
  tipo_origen: Joi.string().valid('recurrente', 'debito_automatico', 'compra', 'unico').required()
    .messages({
      'string.base': 'El tipo de origen debe ser un texto',
      'any.only': 'El tipo de origen debe ser uno de: recurrente, debito_automatico, compra, unico',
      'any.required': 'El tipo de origen es requerido'
    }),
  id_origen: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El ID de origen debe ser un número',
      'number.integer': 'El ID de origen debe ser un número entero',
      'number.positive': 'El ID de origen debe ser un ID válido',
      'any.required': 'El ID de origen es requerido'
    })
}).or('monto_ars', 'monto_usd')
  .messages({
    'object.missing': 'Debe proporcionar al menos monto_ars o monto_usd'
  }).unknown(false);

// Esquemas para filtros y parámetros
const gastoFiltersSchema = Joi.object({
  categoria_gasto_id: Joi.number().integer().positive().optional(),
  importancia_gasto_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  tipo_pago_id: Joi.number().integer().positive().optional(),
  tarjeta_id: Joi.number().integer().positive().optional(),
  fecha_desde: Joi.date().iso().optional(),
  fecha_hasta: Joi.date().iso().min(Joi.ref('fecha_desde')).optional(),
  monto_min_ars: Joi.number().positive().optional(),
  monto_max_ars: Joi.number().positive().min(Joi.ref('monto_min_ars')).optional(),
  monto_min_usd: Joi.number().positive().optional(),
  monto_max_usd: Joi.number().positive().min(Joi.ref('monto_min_usd')).optional(),
  tipo_origen: Joi.string().valid('unico', 'recurrente', 'debito_automatico', 'compra').optional(),
  id_origen: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('fecha', 'monto_ars', 'monto_usd', 'descripcion', 'createdAt', 'updatedAt').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
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

      return sendValidationError(res, validationErrors);
    }

    // Reemplazar los datos con los validados
    if (location === 'body') {
      req.body = value;
    } else if (location === 'query') {
      // No reemplazar req.query directamente, solo agregar propiedades validadas
      Object.assign(req.query, value);
    } else if (location === 'params') {
      req.params = value;
    }

    next();
  };
};

// Exportar middlewares de validación unificados
export const validateCreateGasto = createValidationMiddleware(gastoSchema, 'body');
export const validateUpdateGasto = createValidationMiddleware(gastoSchema, 'body');
export const validateCreateCompra = createValidationMiddleware(compraSchema, 'body');
export const validateUpdateCompra = createValidationMiddleware(compraSchema, 'body');
export const validateCreateGastoRecurrente = createValidationMiddleware(gastoRecurrenteSchema, 'body');
export const validateUpdateGastoRecurrente = createValidationMiddleware(gastoRecurrenteSchema, 'body');
export const validateCreateDebitoAutomatico = createValidationMiddleware(debitoAutomaticoSchema, 'body');
export const validateUpdateDebitoAutomatico = createValidationMiddleware(debitoAutomaticoSchema, 'body');
export const validateCreateGastoUnico = createValidationMiddleware(gastoUnicoSchema, 'body');
export const validateUpdateGastoUnico = createValidationMiddleware(gastoUnicoSchema, 'body');
export const validateGastoFilters = createValidationMiddleware(gastoFiltersSchema, 'query');
export const validateGastoUnicoFilters = createValidationMiddleware(gastoUnicoFiltersSchema, 'query');
export const validateCompraFilters = createValidationMiddleware(compraFiltersSchema, 'query');
export const validateGastoRecurrenteFilters = createValidationMiddleware(gastoRecurrenteFiltersSchema, 'query');
export const validateDebitoAutomaticoFilters = createValidationMiddleware(debitoAutomaticoFiltersSchema, 'query');
export const validateIdParam = createValidationMiddleware(idParamSchema, 'params');

// =============================================================================
// TARJETAS VALIDATIONS
// =============================================================================

const tarjetaSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre de la tarjeta es requerido'
    }),

  tipo: Joi.string().valid('debito', 'credito', 'virtual').required()
    .messages({
      'any.only': 'El tipo debe ser: debito, credito o virtual',
      'any.required': 'El tipo de tarjeta es requerido'
    }),

  banco: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'El banco debe tener al menos 2 caracteres',
      'string.max': 'El banco no puede exceder 100 caracteres',
      'any.required': 'El banco es requerido'
    }),

  ultimos_4_digitos: Joi.string().length(4).pattern(/^\d{4}$/).optional().allow(null, '')
    .messages({
      'string.length': 'Debe ingresar exactamente 4 dígitos',
      'string.pattern.base': 'Solo se permiten números'
    }),

  dia_mes_cierre: Joi.when('tipo', {
    is: 'credito',
    then: Joi.number().integer().min(1).max(31).required()
      .messages({
        'number.base': 'El día de cierre debe ser un número',
        'number.integer': 'El día de cierre debe ser un número entero',
        'number.min': 'El día de cierre debe ser entre 1 y 31',
        'number.max': 'El día de cierre debe ser entre 1 y 31',
        'any.required': 'Las tarjetas de crédito requieren día de cierre'
      }),
    otherwise: Joi.any().valid(null).optional()
      .messages({
        'any.only': 'Las tarjetas de débito no deben tener día de cierre'
      })
  }),

  dia_mes_vencimiento: Joi.when('tipo', {
    is: 'credito',
    then: Joi.number().integer().min(1).max(31).required()
      .messages({
        'number.base': 'El día de vencimiento debe ser un número',
        'number.integer': 'El día de vencimiento debe ser un número entero',
        'number.min': 'El día de vencimiento debe ser entre 1 y 31',
        'number.max': 'El día de vencimiento debe ser entre 1 y 31',
        'any.required': 'Las tarjetas de crédito requieren día de vencimiento'
      }),
    otherwise: Joi.any().valid(null).optional()
      .messages({
        'any.only': 'Las tarjetas de débito no deben tener día de vencimiento'
      })
  }),

  permite_cuotas: Joi.boolean().optional()
    .messages({
      'boolean.base': 'El campo permite_cuotas debe ser verdadero o falso'
    })
});

const tarjetaFiltersSchema = Joi.object({
  tipo: Joi.string().valid('debito', 'credito', 'virtual').optional()
    .messages({
      'any.only': 'El tipo debe ser: debito, credito o virtual'
    }),

  banco: Joi.string().trim().min(1).max(100).optional()
    .messages({
      'string.min': 'El banco debe tener al menos 1 caracter para la búsqueda',
      'string.max': 'El banco no puede exceder 100 caracteres'
    }),

  permite_cuotas: Joi.string().valid('true', 'false').optional()
    .messages({
      'any.only': 'El campo permite_cuotas debe ser "true" o "false"'
    }),

  limit: Joi.number().integer().min(1).max(100).optional()
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede ser mayor a 100'
    }),

  offset: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'El offset debe ser un número',
      'number.integer': 'El offset debe ser un número entero',
      'number.min': 'El offset debe ser 0 o mayor'
    }),

  orderBy: Joi.string().valid('nombre', 'tipo', 'banco', 'id').optional()
    .messages({
      'any.only': 'El ordenamiento debe ser por: nombre, tipo, banco o id'
    }),

  orderDirection: Joi.string().valid('ASC', 'DESC').optional()
    .messages({
      'any.only': 'La dirección debe ser ASC o DESC'
    })
});

// Exportar validaciones de tarjeta
export const validateCreateTarjeta = createValidationMiddleware(tarjetaSchema, 'body');
export const validateUpdateTarjeta = createValidationMiddleware(tarjetaSchema, 'body');
export const validateTarjetaFilters = createValidationMiddleware(tarjetaFiltersSchema, 'query');

// =============================================================================
// PROYECCION VALIDATIONS
// =============================================================================

const proyeccionFiltersSchema = Joi.object({
  meses: Joi.number().integer().min(1).max(12).default(3)
    .messages({
      'number.base': 'Los meses deben ser un número',
      'number.integer': 'Los meses deben ser un número entero',
      'number.min': 'Los meses deben ser al menos 1',
      'number.max': 'Los meses no pueden exceder 12'
    })
}).unknown(false);

// Exportar validación de proyección
export const validateProyeccionFilters = createValidationMiddleware(proyeccionFiltersSchema, 'query');

// =============================================================================
// SALUD FINANCIERA VALIDATIONS
// =============================================================================

const saludFinancieraFiltersSchema = Joi.object({
  periodo: Joi.string().valid('semana', 'mes', 'trimestre', 'anio').default('mes')
    .messages({
      'any.only': 'El período debe ser: semana, mes, trimestre o anio'
    })
}).unknown(false);

// Exportar validación de salud financiera
export const validateSaludFinancieraFilters = createValidationMiddleware(saludFinancieraFiltersSchema, 'query');

// =============================================================================
// INGRESOS VALIDATIONS
// =============================================================================

// Esquema base para ingresos
const baseIngresoSchema = {
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

  fuente_ingreso_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La fuente de ingreso debe ser un número',
      'number.integer': 'La fuente de ingreso debe ser un número entero',
      'number.positive': 'La fuente de ingreso debe ser un ID válido',
      'any.required': 'La fuente de ingreso es requerida'
    })
};

// Ingreso Único
const ingresoUnicoSchema = Joi.object({
  descripcion: baseIngresoSchema.descripcion,
  monto: baseIngresoSchema.monto,
  fuente_ingreso_id: baseIngresoSchema.fuente_ingreso_id,
  fecha: Joi.date().iso().max('now').required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'date.max': 'La fecha no puede ser futura',
      'any.required': 'La fecha es requerida'
    }),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden()
}).unknown(false);

const ingresoUnicoFiltersSchema = Joi.object({
  fuente_ingreso_id: Joi.number().integer().positive().optional(),
  fecha_desde: Joi.date().iso().optional(),
  fecha_hasta: Joi.date().iso().min(Joi.ref('fecha_desde')).optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('fecha', 'monto', 'descripcion', 'created_at', 'updated_at').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

// Ingreso Recurrente
const ingresoRecurrenteSchema = Joi.object({
  descripcion: baseIngresoSchema.descripcion,
  monto: baseIngresoSchema.monto,
  fuente_ingreso_id: baseIngresoSchema.fuente_ingreso_id,
  dia_de_pago: Joi.number().integer().min(1).max(31).required()
    .messages({
      'number.base': 'El día de pago debe ser un número',
      'number.integer': 'El día de pago debe ser un número entero',
      'number.min': 'El día de pago debe ser al menos 1',
      'number.max': 'El día de pago no puede exceder 31',
      'any.required': 'El día de pago es requerido'
    }),
  mes_de_pago: Joi.number().integer().min(1).max(12).optional().allow(null)
    .messages({
      'number.base': 'El mes de pago debe ser un número',
      'number.integer': 'El mes de pago debe ser un número entero',
      'number.min': 'El mes de pago debe ser al menos 1',
      'number.max': 'El mes de pago no puede exceder 12'
    }),
  frecuencia_gasto_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'La frecuencia debe ser un número',
      'number.integer': 'La frecuencia debe ser un número entero',
      'number.positive': 'La frecuencia debe ser un ID válido',
      'any.required': 'La frecuencia es requerida'
    }),
  fecha_inicio: Joi.date().iso().optional().allow(null)
    .messages({
      'date.base': 'La fecha de inicio debe ser una fecha válida',
      'date.format': 'La fecha de inicio debe estar en formato ISO'
    }),
  fecha_fin: Joi.date().iso().optional().allow(null)
    .messages({
      'date.base': 'La fecha de fin debe ser una fecha válida',
      'date.format': 'La fecha de fin debe estar en formato ISO'
    }),
  activo: Joi.boolean().default(true),
  // 💱 Multi-currency fields
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_referencia: Joi.forbidden()
}).unknown(false);

const ingresoRecurrenteFiltersSchema = Joi.object({
  fuente_ingreso_id: Joi.number().integer().positive().optional(),
  frecuencia_gasto_id: Joi.number().integer().positive().optional(),
  monto_min: Joi.number().positive().optional(),
  monto_max: Joi.number().positive().min(Joi.ref('monto_min')).optional(),
  activo: Joi.boolean().optional(),
  dia_de_pago: Joi.number().integer().min(1).max(31).optional(),
  mes_de_pago: Joi.number().integer().min(1).max(12).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  orderBy: Joi.string().valid('monto', 'descripcion', 'dia_de_pago', 'mes_de_pago', 'activo', 'created_at', 'updated_at').optional(),
  orderDirection: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
}).unknown(false);

// Exportar validaciones de ingresos
export const validateCreateIngresoUnico = createValidationMiddleware(ingresoUnicoSchema, 'body');
export const validateUpdateIngresoUnico = createValidationMiddleware(ingresoUnicoSchema, 'body');
export const validateIngresoUnicoFilters = createValidationMiddleware(ingresoUnicoFiltersSchema, 'query');
export const validateCreateIngresoRecurrente = createValidationMiddleware(ingresoRecurrenteSchema, 'body');
export const validateUpdateIngresoRecurrente = createValidationMiddleware(ingresoRecurrenteSchema, 'body');
export const validateIngresoRecurrenteFilters = createValidationMiddleware(ingresoRecurrenteFiltersSchema, 'query');

// =============================================================================
// CUENTAS BANCARIAS VALIDATIONS
// =============================================================================

const cuentaBancariaSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre de la cuenta es requerido'
    }),

  banco: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'El banco debe tener al menos 2 caracteres',
      'string.max': 'El banco no puede exceder 100 caracteres',
      'any.required': 'El banco es requerido'
    }),

  tipo: Joi.string().valid('ahorro', 'corriente').required()
    .messages({
      'any.only': 'El tipo debe ser: ahorro o corriente',
      'any.required': 'El tipo de cuenta es requerido'
    }),

  ultimos_4_digitos: Joi.string().length(4).pattern(/^\d{4}$/).optional().allow(null, '')
    .messages({
      'string.length': 'Debe ingresar exactamente 4 dígitos',
      'string.pattern.base': 'Solo se permiten números'
    }),

  moneda: Joi.string().valid('ARS', 'USD').default('ARS')
    .messages({
      'any.only': 'La moneda debe ser: ARS o USD'
    }),

  activa: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'El campo activa debe ser verdadero o falso'
    })
});

const cuentaBancariaFiltersSchema = Joi.object({
  tipo: Joi.string().valid('ahorro', 'corriente').optional()
    .messages({
      'any.only': 'El tipo debe ser: ahorro o corriente'
    }),

  banco: Joi.string().trim().min(1).max(100).optional()
    .messages({
      'string.min': 'El banco debe tener al menos 1 caracter para la búsqueda',
      'string.max': 'El banco no puede exceder 100 caracteres'
    }),

  moneda: Joi.string().valid('ARS', 'USD').optional()
    .messages({
      'any.only': 'La moneda debe ser: ARS o USD'
    }),

  activa: Joi.string().valid('true', 'false').optional()
    .messages({
      'any.only': 'El campo activa debe ser "true" o "false"'
    }),

  limit: Joi.number().integer().min(1).max(100).optional()
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede ser mayor a 100'
    }),

  offset: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'El offset debe ser un número',
      'number.integer': 'El offset debe ser un número entero',
      'number.min': 'El offset debe ser 0 o mayor'
    }),

  orderBy: Joi.string().valid('nombre', 'tipo', 'banco', 'id').optional()
    .messages({
      'any.only': 'El ordenamiento debe ser por: nombre, tipo, banco o id'
    }),

  orderDirection: Joi.string().valid('ASC', 'DESC').optional()
    .messages({
      'any.only': 'La dirección debe ser ASC o DESC'
    })
});

// Exportar validaciones de cuentas bancarias
export const validateCreateCuentaBancaria = createValidationMiddleware(cuentaBancariaSchema, 'body');
export const validateUpdateCuentaBancaria = createValidationMiddleware(cuentaBancariaSchema, 'body');
export const validateCuentaBancariaFilters = createValidationMiddleware(cuentaBancariaFiltersSchema, 'query');
