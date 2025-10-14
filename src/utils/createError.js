export function createError({ status = 500, message = 'Error del servidor', details = [] }) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
