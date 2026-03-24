const redisService = require('../services/redis.service');
const logger = require('../config/logger');

/**
 * Middleware de Idempotencia para endpoints críticos
 * Utiliza el header 'Idempotency-Key' para evitar múltiples ejecuciones de la misma petición
 */
const idempotencia = (prefix = 'idempotency') => {
    return async (req, res, next) => {
        const key = req.headers['idempotency-key'];

        if (!key) {
            return next();
        }

        const idempotencyKey = `${prefix}:${key}:${req.userId || req.ip}`;

        try {
            // Intentar obtener una respuesta previa almacenada
            const cachedResponse = await redisService.get(idempotencyKey);
            
            if (cachedResponse) {
                const parsedResponse = JSON.parse(cachedResponse);
                logger.info(`[Idempotency] ♻️ Reutilizando respuesta para key: ${key}`);
                return res.status(parsedResponse.status).json(parsedResponse.body);
            }

            // Interceptar la respuesta original para guardarla
            const originalJson = res.json;
            res.json = function (body) {
                // Solo cacheamos respuestas exitosas (2xx) o conflictos de duplicado conocidos (409)
                if (res.statusCode >= 200 && res.statusCode < 300 || res.statusCode === 409) {
                    const responseToCache = {
                        status: res.statusCode,
                        body: body
                    };
                    // Guardar en Redis con un TTL de 24 horas para evitar duplicados persistentes
                    redisService.set(idempotencyKey, JSON.stringify(responseToCache), 24 * 60 * 60)
                        .catch(err => logger.error(`[Idempotency] Error al guardar en Redis: ${err.message}`));
                }
                
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            logger.error(`[Idempotency] Error inesperado: ${error.message}`);
            next(); // Continuar a pesar del error de Redis
        }
    };
};

module.exports = {
    idempotencia
};
