const redis = require('../../../services/redis.service');
const User = require('../../../models/User.model');
const logger = require('../../../config/logger');

class RankingService {
    constructor() {
        this.GLOBAL_KEY = 'arena:global';
        this.COUNTRY_PREFIX = 'arena:country:';
        this.STATE_PREFIX = 'arena:state:'; // arena:state:[pais]:[estado]
        this.WEEKLY_KEY = 'arena:weekly';
    }

    /**
     * Actualiza el ranking de un usuario en Redis
     */
    async updateRank(userId, score, country, state) {
        try {
            const globalPromise = redis.zadd(this.GLOBAL_KEY, score, userId.toString());
            const weeklyPromise = redis.zadd(this.WEEKLY_KEY, score, userId.toString());

            const promises = [globalPromise, weeklyPromise];

            if (country) {
                promises.push(redis.zadd(`${this.COUNTRY_PREFIX}${country}`, score, userId.toString()));
            }

            if (country && state) {
                promises.push(redis.zadd(`${this.STATE_PREFIX}${country}:${state}`, score, userId.toString()));
            }

            await Promise.all(promises);
        } catch (error) {
            console.error('Error actualizando ranking en Redis:', error.message);
        }
    }

    /**
     * Obtiene el top ranking
     */
    async getTopRanking(type = 'global', country = null, state = null, limit = 100) {
        try {
            let key = this.GLOBAL_KEY;

            if (type === 'country' && country) {
                key = `${this.COUNTRY_PREFIX}${country}`;
            } else if (type === 'state' && country && state) {
                key = `${this.STATE_PREFIX}${country}:${state}`;
            } else if (type === 'weekly') {
                key = this.WEEKLY_KEY;
            }

            if (!redis.isConnected) {
                return await this._getRankingFromMongo(type, country, state, limit);
            }

            const rawRanking = await redis.zrevrange(key, 0, limit - 1, true);
            logger.info(`[RankingService] 🔍 Redis Key: ${key}, Raw Data Count: ${rawRanking?.length / 2 || 0}`);

            if (!rawRanking || rawRanking.length === 0) {
                return await this._getRankingFromMongo(type, country, state, limit);
            }

            // El formato de WITHSCORES es [member, score, member, score...]
            const formatted = [];
            for (let i = 0; i < rawRanking.length; i += 2) {
                formatted.push({
                    userId: rawRanking[i],
                    rankPoints: parseInt(rawRanking[i + 1])
                });
            }

            // Enriquecer con datos de usuario
            const userIds = formatted.map(f => f.userId);
            const users = await User.find({ _id: { $in: userIds } })
                .select('nombres apellidos social.fotoPerfil arena.level personal.ubicacion.pais personal.ubicacion.estado')
                .lean();

            return formatted.map(f => {
                const userData = users.find(u => u._id.toString() === f.userId);
                return {
                    ...f,
                    user: userData ? {
                        name: `${userData.nombres?.primero || 'Guerrero'} ${userData.apellidos?.primero || ''}`.trim(),
                        avatar: userData.social?.fotoPerfil,
                        level: userData.arena?.level,
                        country: userData.personal?.ubicacion?.pais,
                        state: userData.personal?.ubicacion?.estado
                    } : null
                };
            }).filter(item => item.user);

        } catch (error) {
            console.error('❌ [RankingService.getTopRanking] Error crítico:', error);
            return await this._getRankingFromMongo(type, country, state, limit);
        }
    }

    /**
     * Obtiene la posición y puntaje de un usuario específico
     */
    async getUserRank(userId, type = 'global', country = null, state = null) {
        try {
            let key = this.GLOBAL_KEY;
            if (type === 'country' && country) {
                key = `${this.COUNTRY_PREFIX}${country}`;
            } else if (type === 'state' && country && state) {
                key = `${this.STATE_PREFIX}${country}:${state}`;
            }

            const [rank, score] = await Promise.all([
                redis.zrevrank(key, userId.toString()),
                redis.zscore(key, userId.toString())
            ]);

            return {
                position: rank !== null ? rank + 1 : null,
                score: score !== null ? parseInt(score) : 0
            };
        } catch (error) {
            return { position: null, score: 0 };
        }
    }

    /**
     * Fallback a MongoDB si Redis falla
     */
    async _getRankingFromMongo(type, country, state, limit) {
        try {
            const query = {};
            if (type === 'country' && country) {
                query['personal.ubicacion.pais'] = country;
            } else if (type === 'state' && country && state) {
                query['personal.ubicacion.pais'] = country;
                query['personal.ubicacion.estado'] = state;
            }

            const users = await User.find(query)
                .sort({ 'arena.rankPoints': -1 })
                .limit(limit)
                .select('nombres apellidos social.fotoPerfil arena.level arena.rankPoints personal.ubicacion.pais personal.ubicacion.estado')
                .lean();

            return users.map(u => ({
                userId: u._id,
                rankPoints: u.arena?.rankPoints || 0,
                user: {
                    name: `${u.nombres?.primero || 'Guerrero'} ${u.apellidos?.primero || ''}`.trim(),
                    avatar: u.social?.fotoPerfil,
                    level: u.arena?.level,
                    country: u.personal?.ubicacion?.pais,
                    state: u.personal?.ubicacion?.estado
                }
            }));
        } catch (error) {
            console.error('❌ [RankingService._getRankingFromMongo] Error fatal:', error);
            throw error;
        }
    }
}

module.exports = new RankingService();
