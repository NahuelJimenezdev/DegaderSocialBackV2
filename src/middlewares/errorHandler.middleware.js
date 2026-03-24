const logger = require('../config/logger');

/**
 * Middleware Global de Manejo de Errores
 * Centraliza la captura de errores de MongoDB (E11000) y otros fallos comunes
 */
const globalErrorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const correlationId = req.headers['x-correlation-id'] || `err-${Date.now()}`;

    // 1. Manejo de Errores de MongoDB (Duplicate Key E11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        logger.warn(`[${correlationId}] ⚠️ Conflicto de duplicidad (E11000): ${field}`, {
            field,
            value: err.keyValue,
            path: req.originalUrl,
            userId: req.userId
        });

        let message = 'Ya existe un registro con estos datos.';
        if (field.includes('pastorPrincipal')) {
            message = 'Ya tienes una iglesia registrada como pastor principal.';
        } else if (field.includes('nombre') || field.includes('ciudad')) {
            message = 'Ya existe una iglesia con este nombre en esta ciudad.';
        }

        return res.status(409).json({
            success: false,
            message,
            error: 'DuplicateKeyError',
            field
        });
    }

    // 2. Manejo de Errores de Validación de Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        logger.warn(`[${correlationId}] ⚠️ Error de validación: ${errors.join(', ')}`);
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errors
        });
    }

    // 3. Error por defecto
    logger.error(`[${correlationId}] ❌ Error Crítico: ${err.message}`, {
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.originalUrl,
        userId: req.userId
    });

    res.status(status).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = globalErrorHandler;
