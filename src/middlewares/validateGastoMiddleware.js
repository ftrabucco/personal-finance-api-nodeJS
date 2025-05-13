import { validateGasto, validateGetGastos, validateParamGastoId, validatePutGasto } from '../validations/gastos.validation.js';
import { createError } from '../utils/createError.js';

export function validateCreateGastoMiddleware(req, res, next) {
    const { error } = validateGasto(req.body);

    if (error) {
        return next(createError({
            status: 400,
            message: 'Datos de gasto inválidos',
            details: error.details.map((d) => d.message)
        }));
    }

    next(); // Todo bien, sigue al controller
}



export function validatePutGastoMiddleware(req, res, next) {
    const { error } = validatePutGasto(req.body);

    if (error) {
        return next(createError({
            status: 400,
            message: 'Datos de gasto inválidos',
            details: error.details.map((d) => d.message)
        }));
    }

    next(); // Todo bien, sigue al controller
}


export function validateGetGastosMiddleware(req, res, next) {
    const { error } = validateGetGastos(req.query);

    if (error) {
        return next(createError({ 
            status: 400, 
            message: 'Filtros inválidos',
            details: error.details.map((d) => d.message) 
        }));
    }

    next();
}

export function validateParamGastoIdMiddleware(req, res, next) {
    
    const { error } = validateParamGastoId(req.params);
    if (error) {
      return next(createError({ status: 400, message: 'ID inválido', details: error.details }));
    }
  
    next();
  }