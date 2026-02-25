const redis = require('../services/redis.service');
const metrics = require('../infrastructure/metrics/metrics.service');

/**
 * Sliding Window Rate Limit Middleware
 */
const distributedRateLimit = ({ maxPerMinute, windowSeconds = 60, type = 'api' }) => {
    return async (req, res, next) => {
        if (!redis.isConnected) return next();

        const identifier = type === 'game' ? (req.user?.id || req.ip) : req.ip;
        const key = `arena:ratelimit:${type}:${identifier}`;
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        try {
            const multi = redis.client.multi();

            // 1. Remover entradas viejas fuera de la ventana
            multi.zremrangebyscore(key, 0, windowStart);

            // 2. Agregar el request actual
            multi.zadd(key, now, `${now}-${Math.random()}`);

            // 3. Contar elementos en la ventana
            multi.zcard(key);

            // 4. Renovar TTL
            multi.expire(key, windowSeconds + 5);

            const results = await multi.exec();
            const currentCount = results[2][1];

            if (currentCount > maxPerMinute) {
                metrics.incSuspicious(`rate_limit_${type}_exceeded`);
                return res.status(429).json({
                    status: 429,
                    error: 'Too many requests',
                    message: `Has superado el límite permitido (${maxPerMinute}/${windowSeconds}s).`
                });
            }

            next();
        } catch (error) {
            console.error('Error en Sliding Window Rate Limit:', error.message);
            next(); // Fail open
        }
    };
};

module.exports = distributedRateLimit;
