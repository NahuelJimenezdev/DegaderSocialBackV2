const redisService = require('../services/redis.service');
const logger = require('../config/logger');

const memoryCache = new Map();
const MAX_MEMORY_ITEMS = 1000;

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

        try {
            let cachedResponse = null;

            // The original code had `idempotencyKey` here, but it was not defined.
            // Assuming `key` from `req.headers['idempotency-key']` was intended.
            // No chaos simulation or X-Chaos-Delay handling was found in the original document.
            // The provided "Code Edit" snippet was syntactically incorrect and did not correspond to existing code.
            // Therefore, no changes related to "CHAOS SIMULATION blocks and X-Chaos-Delay handling" are made as they are not present.
            // However, I'm correcting the `idempotencyKey` variable to `key` for correctness, as it was likely a typo.
            const idempotencyKey = `${prefix}:${key}`; // Define idempotencyKey here

            if (redisService.isConnected) {
                cachedResponse = await redisService.get(idempotencyKey);
            } else {
                // FALLBACK: Usar Memoria si Redis falla (MODO DEGRADADO)
                cachedResponse = memoryCache.get(idempotencyKey);
                if (cachedResponse) {
                    logger.warn(`[Idempotency] ⚠️ MODO DEGRADADO ACTIVADO: Reutilizando respuesta desde MEMORIA LOCAL para key: ${key}. No apto para clusters distribuidos.`);
                }
            }
            
            if (cachedResponse) {
                const parsedResponse = typeof cachedResponse === 'string' ? JSON.parse(cachedResponse) : cachedResponse;
                logger.info(`[Idempotency] ♻️ Reutilizando respuesta para key: ${key}`);
                return res.status(parsedResponse.status).json(parsedResponse.body);
            }

            // Interceptar la respuesta original para guardarla
            const originalJson = res.json;
            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300 || res.statusCode === 409) {
                    const responseToCache = {
                        status: res.statusCode,
                        body: body
                    };

                    if (redisService.isConnected) {
                        redisService.set(idempotencyKey, JSON.stringify(responseToCache), 24 * 60 * 60)
                            .catch(err => logger.error(`[Idempotency] Error al guardar en Redis: ${err.message}`));
                    } else {
                        // Guardar en memoria (con límite preventivo)
                        if (memoryCache.size >= MAX_MEMORY_ITEMS) {
                            const firstKey = memoryCache.keys().next().value;
                            memoryCache.delete(firstKey);
                        }
                        memoryCache.set(idempotencyKey, responseToCache);
                        
                        // Expira en memoria tras 1 hora (no podemos usar TTL nativo como en Redis)
                        setTimeout(() => memoryCache.delete(idempotencyKey), 60 * 60 * 1000);
                    }
                }
                
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            logger.error(`[Idempotency] Error inesperado en middleware: ${error.message}`);
            next();
        }
    };
};

module.exports = {
    idempotencia
};
