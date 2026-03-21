const redisService = require('./redis.service');
const Post = require('../models/Post.model');
const PostLike = require('../models/PostLike.model');
const PostComment = require('../models/PostComment.model');
const Friendship = require('../models/Friendship.model');
const Group = require('../models/Group.model');
const logger = require('../config/logger');

class FeedService {
    /**
     * Calcula el score de relevancia de un post.
     * @param {Object} post 
     * @returns {Promise<Number>}
     */
    async calculatePostScore(post, viewerId = null, affinityData = null) {
        // 1. Engagement Weight (Ajustado según modelo Phase 3)
        const engagementWeight = 
            (post.likesCount || 0) * 3 +
            (post.commentsCount || 0) * 5 +
            (post.sharesCount || 0) * 7;

        // 2. Freshness & Time Decay
        const hoursSinceCreation = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        
        let recencyBoost = 0;
        if (hoursSinceCreation <= 2) {
            recencyBoost = 150 - (hoursSinceCreation * 25);
        } else if (hoursSinceCreation <= 24) {
            recencyBoost = Math.max(0, 100 - (hoursSinceCreation * 4)); 
        }
        
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

        // 4. User Affinity Avanzado
        let userAffinity = 0;
        if (viewerId) {
            const authorId = post.usuario._id ? post.usuario._id.toString() : post.usuario.toString();
            
            if (authorId === viewerId.toString()) {
                userAffinity += 30; // Boost extra al propio contenido
            } else {
                userAffinity += 10; // Conexión base (está en su feed)
                
                // Si pasamos la data real de afinidad calculada en batch
                if (affinityData) {
                    const likesToAuthor = affinityData.likes || 0;
                    const commentsToAuthor = affinityData.comments || 0;
                    userAffinity += (likesToAuthor * 2) + (commentsToAuthor * 4);
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
            const targetUsersArray = Array.from(new Set(targetUserIds));

            // Optimización: Pre-cachear top 50 posts del autor para la agregación
            const recentPostsQuery = await Post.find({ usuario: authorId }).sort({createdAt: -1}).limit(50).select('_id').lean();
            const authorPostIds = recentPostsQuery.map(p => p._id);
            const postIdStr = post._id.toString();

            // PROCESAMIENTO CONCURRENTE LOTEADO (BATCHING)
            const batchSize = 100;
            for (let i = 0; i < targetUsersArray.length; i += batchSize) {
                const batch = targetUsersArray.slice(i, i + batchSize);
                
                // Aggregations seguras y mega-optimizadas
                const likesAggr = await PostLike.aggregate([
                    { $match: { usuario: { $in: batch }, post: { $in: authorPostIds } } },
                    { $group: { _id: "$usuario", count: { $sum: 1 } } }
                ]);
                const commentsAggr = await PostComment.aggregate([
                    { $match: { usuario: { $in: batch }, post: { $in: authorPostIds } } },
                    { $group: { _id: "$usuario", count: { $sum: 1 } } }
                ]);

                // Mapear resultados
                const affinityMap = {};
                batch.forEach(id => affinityMap[id] = { likes: 0, comments: 0 });
                likesAggr.forEach(l => affinityMap[l._id.toString()].likes = l.count);
                commentsAggr.forEach(c => affinityMap[c._id.toString()].comments = c.count);

                const pipeline = redisService.client.pipeline();
                
                await Promise.all(batch.map(async (userId) => {
                    try {
                        const score = await this.calculatePostScore(post, userId, affinityMap[userId]);
                        const feedKey = `user:feed:${userId}`;
                        pipeline.zadd(feedKey, score, postIdStr);
                        pipeline.zremrangebyrank(feedKey, 0, -1001); // Límite estricto de 1000 posts
                    } catch(e) { }
                }));

                await pipeline.exec();
                
                // Ceder event-loop temporalmente para no bloquear Node JS en picos masivos
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            logger.info(`🔄 [FEED_SYNC] Score actualizado en lotes para post ${postId} en ${targetUsersArray.length} feeds.`);
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

            // Optimización: Pre-cachear top 50 posts del autor para la agregación
            const recentPostsQuery = await Post.find({ usuario: authorId }).sort({createdAt: -1}).limit(50).select('_id').lean();
            const authorPostIds = recentPostsQuery.map(p => p._id);

            // CONTROL DE CONCURRENCIA LOTEADA (BATCHING Phase 3.5)
            const batchSize = 100;
            for (let i = 0; i < targetUsersArray.length; i += batchSize) {
                const batch = targetUsersArray.slice(i, i + batchSize);
                
                const likesAggr = await PostLike.aggregate([
                    { $match: { usuario: { $in: batch }, post: { $in: authorPostIds } } },
                    { $group: { _id: "$usuario", count: { $sum: 1 } } }
                ]);
                const commentsAggr = await PostComment.aggregate([
                    { $match: { usuario: { $in: batch }, post: { $in: authorPostIds } } },
                    { $group: { _id: "$usuario", count: { $sum: 1 } } }
                ]);

                const affinityMap = {};
                batch.forEach(id => affinityMap[id] = { likes: 0, comments: 0 });
                likesAggr.forEach(l => affinityMap[l._id.toString()].likes = l.count);
                commentsAggr.forEach(c => affinityMap[c._id.toString()].comments = c.count);

                const pipeline = redisService.client.pipeline();
                
                await Promise.all(batch.map(async (userId) => {
                    try {
                        const score = await this.calculatePostScore(post, userId, affinityMap[userId]);
                        const feedKey = `user:feed:${userId}`;
                        pipeline.zadd(feedKey, score, postIdStr);
                        pipeline.zremrangebyrank(feedKey, 0, -1001); // Mantener top 1000 posts listos
                        pipeline.expire(feedKey, 60 * 60 * 24 * 3); // 3 días en caché
                    } catch(e) { }
                }));

                await pipeline.exec();
                
                // Ceder thread de JS
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            const duration = Date.now() - startTime;
            logger.info(`✅ [FEED_FANOUT] fanout_time: ${duration}ms | targets (afinidades masivas en BATCH): ${targetUsersArray.length}`);

        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error en fan-out del post ${post._id}:`, error);
        }
    }

    /**
     * Interaction Boost Dinámico (TikTok Style).
     * Sube el score temporal de los últimos posts de un autor en el feed de un usuario
     * cuando dicho usuario interactúa (ej. da like).
     */
    async boostAuthorInUserFeed(viewerId, authorId) {
        try {
            if (!redisService.isConnected) return;
            const feedKey = `user:feed:${viewerId}`;
            
            // Buscar últimos 10 posts de este autor para empujarlos en el feed del usuario
            const posts = await Post.find({ usuario: authorId }).sort({createdAt: -1}).limit(10).select('_id').lean();
            if (!posts.length) return;

            const pipeline = redisService.client.pipeline();
            posts.forEach(p => {
                // ZINCRBY empuja artificalmente estos posts +50pts temporalmente 
                pipeline.zincrby(feedKey, 50, p._id.toString());
            });
            
            await pipeline.exec();
            logger.info(`🚀 [FEED_BOOST] User ${viewerId} interactuó con Author ${authorId}. Boost de +50 aplicado a 10 posts.`);
        } catch (error) {
            logger.error(`❌ [FEED_SERVICE] Error ejecutando Interaction Boost temporal:`, error.message);
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
