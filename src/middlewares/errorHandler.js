/**
 * Middleware para manejo centralizado de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error capturado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      ok: false,
      error: 'Error de validación',
      detalles: errors
    });
  }

  // Error de documento duplicado (código 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      ok: false,
      error: `El ${field} ya existe en el sistema`
    });
  }

  // Error de cast (ID inválido de MongoDB)
  if (err.name === 'CastError') {
    return res.status(400).json({
      ok: false,
      error: 'ID inválido'
    });
  }

  // Error por defecto
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Middleware para rutas no encontradas
 */
const notFound = (req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Ruta no encontrada',
    path: req.path
  });
};

module.exports = {
  errorHandler,
  notFound
};
