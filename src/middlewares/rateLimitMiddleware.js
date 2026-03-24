const rateLimit = require('express-rate-limit');

/**
 * Limitador específico para la creación de iglesias
 * Evita ráfagas de peticiones accidentales o malintencionadas
 */
const crearIglesiaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3, // Limitar a 3 peticiones por minuto por entidad
    keyGenerator: (req) => {
        return req.userId || req.ip; // Priorizar ID de usuario para evitar bloqueos por IP compartida
    },
    message: {
        success: false,
        message: 'Demasiadas peticiones de creación. Por favor, intenta de nuevo en un minuto.',
        errors: ['Rate limit exceeded']
    },
    standardHeaders: true, // Retorna info de rate limit en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
    // Skip si es admin (opcional)
    skip: (req) => req.user?.rolSistema === 'admin' || req.user?.rolSistema === 'Founder'
});

module.exports = {
    crearIglesiaLimiter
};
