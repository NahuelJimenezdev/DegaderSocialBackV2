/**
 * cache.service.js
 * Auth user cache using Redis with TTL 300s.
 * Provides getUser / setUser / invalidateUser with full logging.
 */
const redis = require('./redis.service');
const logger = require('../config/logger');

const USER_CACHE_TTL = 300; // 5 minutes
const KEY_PREFIX = 'user:';

const cacheKey = (userId) => `${KEY_PREFIX}${userId}`;

/**
 * Get a user from Redis cache.
 * Returns the parsed user object or null (miss or Redis down).
 */
async function getUser(userId) {
    try {
        const raw = await redis.get(cacheKey(userId));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        logger.warn(`[AUTH-CACHE] Error reading cache for ${userId}: ${err.message}`);
        return null;
    }
}

/**
 * Persist a user object into Redis with TTL.
 */
async function setUser(userId, userObject) {
    try {
        // Store sanitized version (Bare minimum for AUTH logic)
        // This ensures Redis stays tiny (<0.5KB) regardless of the source object size
        const safeUser = {
            _id: userObject._id || userObject.id,
            email: userObject.email,
            rol: userObject.rol || userObject.seguridad?.rolSistema,
            seguridad: {
                rolSistema: userObject.rol || userObject.seguridad?.rolSistema,
                estadoCuenta: userObject.seguridad?.estadoCuenta || 'activo',
                fechaFinSuspension: userObject.seguridad?.fechaFinSuspension
            },
            fundacion: {
                nivel: userObject.fundacion?.nivel,
                area: userObject.fundacion?.area,
                territorio: userObject.fundacion?.territorio
            },
            __v: userObject.__v
        };
        await redis.set(cacheKey(userId), safeUser, USER_CACHE_TTL);
    } catch (err) {
        logger.warn(`[AUTH-CACHE] Error writing cache for ${userId}: ${err.message}`);
    }
}

/**
 * Remove a user from Redis cache (e.g., after role/permission changes).
 */
async function invalidateUser(userId) {
    try {
        const deleted = await redis.del(cacheKey(userId));
        if (deleted > 0) {
            logger.info(`[AUTH-CACHE] 🗑️  Invalidated cache for user ${userId}`);
        }
    } catch (err) {
        logger.warn(`[AUTH-CACHE] Error invalidating cache for ${userId}: ${err.message}`);
    }
}

module.exports = { getUser, setUser, invalidateUser };
