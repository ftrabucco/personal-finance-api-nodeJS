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
  