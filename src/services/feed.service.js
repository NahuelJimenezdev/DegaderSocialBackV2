const redisService = require('./redis.service');
const Post = require('../models/Post.model');
const Friendship = require('../models/Friendship.model');
const Group = require('../models/Group.model');
const logger = require('../config/logger');

class FeedService {
    /**
     * Calcula el score de relevancia de un post.
     * @param {Object} post 
     * @returns {Promise<Number>}
     */
    async calculatePostScore(post, viewerId = null) {
        // 1. Engagement Weight (Ajustado según modelo Phase 3)
        const engagementWeight = 
            (post.likesCount || 0) * 3 +
            (post.commentsCount || 0) * 5 +
            (post.sharesCount || 0) * 7;

        // 2. Freshness & Time Decay
        const hoursSinceCreation = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        
        // Recency Boost (Boost inicial muy fuerte en las primeras 2 horas)
        let recencyBoost = 0;
        if (hoursSinceCreation <= 2) {
            recencyBoost = 150 - (hoursSinceCreation * 25); // Ej: 0h=150, 1h=125, 2h=100
        } else if (hoursSinceCreation <= 24) {
            recencyBoost = Math.max(0, 100 - (hoursSinceCreation * 4)); 
        }
        
        // Decay (penalización progresiva crítica por tiempo)
        const decayFactor = 3;
        const timeDecay = hoursSinceCreation * decayFactor;

        // 3. Official / Priority Boost
        let priorityBoost = 0;
        try {
            let authorRole = null;
            if (post.usuario && post.usuario.seguridad && post.usuario.seguridad.rolSistema) {
                authorRole = post.usuario.seguridad.rolSistema;
            } else if (post.usuario) {
                const User = require('../models/User.model');
                const authorId = post.usuario._id || post.usuario;
                const author = await User.findById(authorId).select('seguridad.rolSistema').lean();
                if (author && author.seguridad) {
                    authorRole = author.seguridad.rolSistema;
                }
            }

            if (authorRole && ['Founder', 'admin', 'moderador'].includes(authorRole)) {
                priorityBoost = 500;
            }
        } catch (e) {
            logger.warn('⚠️ [FEED_SERVICE] Error al obtener rol para priority boost:', e.message);
        }

        // 4. User Affinity (Base)
        let userAffinity = 0;
        if (viewerId) {
            const authorId = post.usuario._id ? post.usuario._id.toString() : post.usuario.toString();
            
            if (authorId === viewerId.toString()) {
                userAffinity += 30; // Boost extra al propio contenido
            } else {
                // Logica base: si lo está evaluando para este usuario es porque hay conexión (amigo/grupo)
                userAffinity += 10;
                
                // Si en el futuro post.likes viene populado con IDs
                if (post.likes && Array.isArray(post.likes) && post.likes.includes(viewerId.toString())) {
                    userAffinity += 15; // Ya interactuó antes con este contenido
                }
            }
        }

        // Formula final estilo TikTok/Instagram
        const finalScore = Math.max(0, engagementWeight + recencyBoost + priorityBoost + userAffinity - timeDecay);
        
        if (engagementWeight > 0) {
            logger.info(`📊 [FEED_RANKING] Score: ${finalScore.toFixed(2)} | Eng: ${engagementWeight} | Decay: -${timeDecay.toFixed(1)} | Aff: ${userAffinity} | Post: ${post._id}`);
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

            const authorId = post.usuario.toString();
            // Calcular score base para Mongo (Generic Fallback Ranking)
            const baseScore = await this.calculatePostScore(post, authorId);
            
            // Persistir en MongoDB para búsquedas Fallback e Influencers
            await Post.updateOne({ _id: postId }, { $set: { relevanceScore: baseScore } });

            // Obtener todos los destinatarios (amigos) ligados al post
            const friendships = await Friendship.find({
                $or: [{ solicitante: authorId, estado: 'aceptada' }, { receptor: authorId, estado: 'aceptada' }]
            }).lean();

            let targetUserIds = friendships.map(f => f.solicitante.toString() === authorId ? f.receptor.toString() : f.solicitante.toString());
            targetUserIds.push(authorId);
            targetUserIds = Array.from(new Set(targetUserIds));

            const pipeline = redisService.client.pipeline();
            
            // Evaluar score con afinidad per-user de forma paralela antes del pipeline
            await Promise.all(targetUserIds.map(async (userId) => {
                try {
                    const personalizedScore = await this.calculatePostScore(post, userId);
                    pipeline.zadd(`user:feed:${userId}`, personalizedScore, postId.toString());
                } catch(e) { /* Ignorar error individual */ }
            }));

            await pipeline.exec();
            logger.info(`🔄 [FEED_SYNC] Score actualizado en tiempo real para post ${postId} en ${targetUserIds.length} feeds.`);
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

            // Agregar auto-follower
            targetUserIds.add(authorId);
            const targetUsersArray = Array.from(targetUserIds);
            const postIdStr = post._id.toString();

            const pipeline = redisService.client.pipeline();
            
            // Mapeo concurrente de afinidades (Personalized Score per User)
            await Promise.all(targetUsersArray.map(async (userId) => {
                try {
                    const score = await this.calculatePostScore(post, userId);
                    const feedKey = `user:feed:${userId}`;
                    pipeline.zadd(feedKey, score, postIdStr);
                    pipeline.zremrangebyrank(feedKey, 0, -1001); // Mantener top 1000 posts listos
                    pipeline.expire(feedKey, 60 * 60 * 24 * 3); // 3 días en caché
                } catch(e) { }
            }));

            await pipeline.exec();
            const duration = Date.now() - startTime;
            logger.info(`✅ [FEED_FANOUT] fanout_time: ${duration}ms | targets (afinidades calcs): ${targetUsersArray.length}`);

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
                        const score = await this.calculatePostScore(p, userId);
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
