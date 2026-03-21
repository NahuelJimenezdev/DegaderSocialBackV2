const redisService = require('./redis.service');
const Post = require('../models/Post');
const Friendship = require('../models/Friendship');
const Group = require('../models/Group');
const logger = require('../config/logger');

class FeedService {
    /**
     * Calcula el score de relevancia de un post.
     * @param {Object} post 
     * @returns {Promise<Number>}
     */
    async calculatePostScore(post) {
        // 1. Engagement Weight
        const engagementWeight = 
            (post.likesCount || 0) * 3 +
            (post.commentsCount || 0) * 5 +
            (post.sharesCount || 0) * 8;

        // 2. Freshness & Decay
        const hoursSinceCreation = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        
        // Boost de frescura (gradual en las primeras 24h)
        const freshnessBoost = Math.max(0, 100 - (hoursSinceCreation * 4)); 
        
        // Decay (penalización por tiempo)
        const timeDecay = hoursSinceCreation * 2;

        // 3. Priority Boost (Staff/Admin)
        let priorityBoost = 0;
        try {
            let authorRole = null;
            
            // Optimización: Usar datos populados si existen
            if (post.usuario && post.usuario.seguridad && post.usuario.seguridad.rolSistema) {
                authorRole = post.usuario.seguridad.rolSistema;
            } else if (post.usuario) {
                const User = require('../models/User.model');
                // Si post.usuario es un ObjectId, hacer query; si es un objeto populado sin rol, usar _id
                const authorId = post.usuario._id || post.usuario;
                const author = await User.findById(authorId).select('seguridad.rolSistema').lean();
                if (author && author.seguridad) {
                    authorRole = author.seguridad.rolSistema;
                }
            }

            if (authorRole && ['Founder', 'admin', 'moderador'].includes(authorRole)) {
                priorityBoost = 500; // Boost fijo alto para contenido oficial
            }
        } catch (e) {
            logger.warn('⚠️ [FEED_SERVICE] Error al obtener rol para priority boost:', e.message);
        }

        const finalScore = engagementWeight + freshnessBoost + priorityBoost - timeDecay;
        
        // Log métricas para debugging del algoritmo
        if (engagementWeight > 0) {
            logger.info(`📊 [FEED_METRIC] ranking_score: ${finalScore.toFixed(2)} | engagement: ${engagementWeight} | post: ${post._id}`);
        }

        return finalScore;
    }

    /**
     * Sincroniza el score de un post en los feeds de Redis y persiste en MongoDB.
     */
    async syncPostScore(postId) {
        try {
            if (!redisService.isConnected) return;

            const post = await Post.findById(postId);
            if (!post) return;

            const newScore = await this.calculatePostScore(post);
            const authorId = post.usuario.toString();
            
            // Persistir en MongoDB para búsquedas Fallback e Influencers
            await Post.updateOne({ _id: postId }, { $set: { relevanceScore: newScore } });

            // Obtener todos los destinatarios (amigos)
            // NOTA: Para alta escala, esto se puede optimizar cacheando friendIds en Redis
            const friendships = await Friendship.find({
                $or: [{ solicitante: authorId, estado: 'aceptada' }, { receptor: authorId, estado: 'aceptada' }]
            }).lean();

            const targetUserIds = friendships.map(f => f.solicitante.toString() === authorId ? f.receptor.toString() : f.solicitante.toString());
            targetUserIds.push(authorId);

            const pipeline = redisService.client.pipeline();
            targetUserIds.forEach(userId => {
                pipeline.zadd(`user:feed:${userId}`, newScore, postId.toString());
            });

            await pipeline.exec();
            logger.info(`🔄 [FEED_METRIC] Score actualizado para post ${postId} en ${targetUserIds.length} feeds.`);
        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error al sincronizar score:`, error);
        }
    }

    /**
     * Distribuye un nuevo post a los feeds de los amigos y/o miembros del grupo.
     * ESTRATEGIA: Hybrid Fan-out + Smart Ranking.
     */
    async fanOutPost(post) {
        const startTime = Date.now();
        try {
            if (!redisService.isConnected) return;

            const authorId = post.usuario.toString();
            const isInfluencer = await this.isInfluencer(authorId);
            
            if (isInfluencer) {
                logger.info(`✨ [FEED_METRIC] Autor ${authorId} es influencer. Saltando fan-out masivo.`);
                return;
            }

            let targetUserIds = new Set();
            const friendships = await Friendship.find({
                $or: [
                    { solicitante: authorId, estado: 'aceptada' },
                    { receptor: authorId, estado: 'aceptada' }
                ]
            }).lean();

            friendships.forEach(f => {
                const friendId = f.solicitante.toString() === authorId ? f.receptor.toString() : f.solicitante.toString();
                targetUserIds.add(friendId);
            });

            if (post.grupo) {
                const group = await Group.findById(post.grupo).select('miembros').lean();
                if (group && group.miembros) {
                    group.miembros.forEach(m => {
                        if (m.usuario.toString() !== authorId) targetUserIds.add(m.usuario.toString());
                    });
                }
            }

            targetUserIds.add(authorId);

            // Calcular Score Inicial
            const score = await this.calculatePostScore(post);
            const postId = post._id.toString();

            const pipeline = redisService.client.pipeline();
            targetUserIds.forEach(userId => {
                const feedKey = `user:feed:${userId}`;
                pipeline.zadd(feedKey, score, postId);
                pipeline.zremrangebyrank(feedKey, 0, -1001);
                pipeline.expire(feedKey, 60 * 60 * 24 * 3);
            });

            await pipeline.exec();
            const duration = Date.now() - startTime;
            logger.info(`✅ [FEED_METRIC] fanout_time: ${duration}ms | score: ${score.toFixed(2)} | targets: ${targetUserIds.size}`);

        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error en fan-out del post ${post._id}:`, error);
        }
    }

    /**
     * Migra/Pre-computa el feed de un usuario desde MongoDB con Ranking.
     */
    async migrateUserFeed(userId, limit = 500) {
        try {
            if (!redisService.isConnected) return;

            const friendIds = (await Friendship.find({
                $or: [{ solicitante: userId, estado: 'aceptada' }, { receptor: userId, estado: 'aceptada' }]
            }).lean()).map(f => f.solicitante.toString() === userId ? f.receptor : f.solicitante);

            const posts = await Post.find({
                $or: [
                    { usuario: { $in: [...friendIds, userId] }, privacidad: { $ne: 'privado' } },
                    { usuario: userId }
                ],
                grupo: { $exists: false }
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

            const feedKey = `user:feed:${userId}`;
            const pipeline = redisService.client.pipeline();
            
            // REFACTOR: Evitar bucle secuencial pesado. Usar Promise.all con batches
            const batchSize = 50; 
            for (let i = 0; i < posts.length; i += batchSize) {
                const batch = posts.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (p) => {
                    try {
                        const score = await this.calculatePostScore(p);
                        pipeline.zadd(feedKey, score, p._id.toString());
                    } catch (scoreErr) {
                        logger.error(`❌ [FEED_SERVICE] Error calculando score para post ${p._id}:`, scoreErr.message);
                    }
                }));
            }
            
            pipeline.expire(feedKey, 60 * 60 * 24 * 3);
            await pipeline.exec();
            
            const size = await redisService.client.zcard(feedKey);
            logger.info(`📦 [FEED_METRIC] feed_size: ${size} | user: ${userId} (Migrado con Ranking)`);
            return size;

        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error migrando feed para user ${userId}:`, error);
        }
    }

    /**
     * Obtiene los IDs de los posts del feed desde Redis.
     */
    async getFeedFromCache(userId, limit = 20, lastScore = '+inf') {
        try {
            if (!redisService.isConnected) return null;

            const feedKey = `user:feed:${userId}`;
            const max = lastScore === '+inf' ? '+inf' : `(${lastScore}`;
            
            const postIds = await redisService.client.zrevrangebyscore(feedKey, max, '-inf', 'LIMIT', 0, limit);
            
            if (!postIds || postIds.length === 0) {
                logger.info(`📡 [FEED_METRIC] redis_hits: 0 | user: ${userId} (Cache Miss)`);
                return null;
            }

            logger.info(`📡 [FEED_METRIC] redis_hits: ${postIds.length} | user: ${userId} (Cache Hit)`);
            return postIds;
        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error al leer feed de Redis para usuario ${userId}:`, error);
            return null;
        }
    }

    /**
     * Invalida el feed de un usuario (ej: al borrar un post)
     * Borra el postId de los feeds de todos los usuarios que pudieron recibirlo.
     */
    async invalidatePost(postId) {
        try {
            if (!redisService.isConnected) return;

            let authorId = null;
            let targetUserIds = new Set();
            let groupId = null;

            try {
                const post = await Post.findById(postId).select('usuario grupo').lean();
                if (post) {
                    authorId = post.usuario.toString();
                    if (post.grupo) groupId = post.grupo;
                }
            } catch (dbError) {
                logger.error(`⚠️ [FEED_SERVICE] Error buscando post ${postId} en Mongo durante invalidación:`, dbError.message);
                // Continuamos para intentar limpiar Redis en caso de fallback si se supieran los targets (aunque sin authorId es límite)
            }

            if (!authorId) {
                logger.warn(`⚠️ [FEED_SERVICE] InvalidatePost: No se encontró autor para el post ${postId} en Mongo. Quedarán IDs huérfanos localizados.`);
                // Fallback: Si no tenemos authorId, intentar borrar globalmente o de caches comunes excede O(N).
                return;
            }

            // Obtener amigos para saber a quién quitarle el post de su ZSET
            const friendships = await Friendship.find({
                $or: [
                    { solicitante: authorId, estado: 'aceptada' },
                    { receptor: authorId, estado: 'aceptada' }
                ]
            }).lean();

            friendships.forEach(f => {
                const friendId = f.solicitante.toString() === authorId ? f.receptor.toString() : f.solicitante.toString();
                targetUserIds.add(friendId);
            });

            if (groupId) {
                const group = await Group.findById(groupId).select('miembros').lean();
                if (group && group.miembros) group.miembros.forEach(m => targetUserIds.add(m.usuario.toString()));
            }

            targetUserIds.add(authorId);

            const pipeline = redisService.client.pipeline();
            targetUserIds.forEach(userId => {
                pipeline.zrem(`user:feed:${userId}`, postId);
            });

            await pipeline.exec();
            logger.info(`🗑️ [FEED_METRIC] Invalidados ${targetUserIds.size} feeds para el post ${postId}`);

        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error al invalidar post ${postId}:`, error);
        }
    }

    /**
     * Verifica si un usuario es VIP o Influencer (para lógica de Fan-Out)
     * @param {String} userId 
     * @returns {Promise<Boolean>}
     */
    async isInfluencer(userId) {
        try {
            const User = require('../models/User.model');
            // FIX CRITICO: se cachean requests a rolsistema de usuarios comunes
            const user = await User.findById(userId).select('seguridad.rolSistema').lean();
            if (user && user.seguridad) {
                return ['Founder', 'admin', 'moderador'].includes(user.seguridad.rolSistema);
            }
            return false;
        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error al verificar influencer status para ${userId}:`, error.message);
            return false;
        }
    }
}

module.exports = new FeedService();
