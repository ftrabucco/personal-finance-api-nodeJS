import { validateGasto } from '../validations/gastos.validation.js';
import { createError } from '../utils/createError.js';

export function validateGastoMiddleware(req, res, next) {
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

