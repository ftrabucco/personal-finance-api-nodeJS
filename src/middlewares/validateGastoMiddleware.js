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

export function errorMiddleware(err, req, res, next) {
    console.error('Error capturado:', err);

    const statusCode = err.status || 500;
    const message = err.message || 'Error Interno del Servidor';
    const detalles = err.details || [];

    res.status(statusCode).json({
        status: 'error',
        message,
        detalles
    });
}
