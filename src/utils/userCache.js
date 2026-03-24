/**
 * userCache.js
 * Convenience util for invalidating the Redis auth cache of a user.
 * Import and call `invalidateUserCache(userId)` anywhere a user document is mutated.
 */
const { invalidateUser } = require('../services/cache.service');

/**
 * Invalidates the Redis auth cache for a given user ID.
 * Safe to call even if Redis is down (the service handles fallback internally).
 *
 * @param {string|ObjectId} userId
 */
async function invalidateUserCache(userId) {
    await invalidateUser(userId.toString());
}

module.exports = { invalidateUserCache };
