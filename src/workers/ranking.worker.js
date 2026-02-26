const { Worker, Queue } = require('bullmq');
const redis = require('../services/redis.service');
const User = require('../models/User.model');
const ArenaSession = require('../models/arenaSession.model');
const rankingService = require('../modules/arena/services/ranking.service');
const economyService = require('../modules/economy/economy.service');
const achievementsService = require('../modules/arena/services/achievements.service');
const metrics = require('../infrastructure/metrics/metrics.service');
const logger = require('../config/logger');

// Conexión Redis para BullMQ
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
};

// Configuración de la Cola (Disponible para que la app principal añada tareas)
const rankingQueue = new Queue('ranking-tasks', { connection });

/**
 * LÓGICA DEL WORKER (Puede correr en un proceso separado)
 */
const startWorker = () => {
    const worker = new Worker('ranking-tasks', async (job) => {
        const startTime = Date.now();
        console.log(`[Worker] 🛠️ Procesando: ${job.name} (${job.id})`);

        try {
            switch (job.name) {
                case 'process-game-result':
                    await handleGameResult(job.data);
                    break;
                case 'weekly-reset':
                    await performWeeklyReset();
                    break;
                default:
                    console.warn(`[Worker] ⚠️ Tarea desconocida: ${job.name}`);
            }

            const duration = (Date.now() - startTime) / 1000;
            metrics.observeRedis('worker_job_processed', duration);

        } catch (error) {
            console.error(`[Worker] ❌ Error en ${job.name}:`, error.message);
            throw error; // Reintento automático de BullMQ
        }
    }, { connection });

    worker.on('completed', (job) => console.log(`[Worker] ✅ Tarea ${job.id} finalizada`));
    worker.on('failed', (job, err) => console.error(`[Worker] ❌ Tarea ${job.id} falló:`, err.message));

    return worker;
};

/**
 * Procesamiento de resultado de partida (Pesado)
 */
async function handleGameResult(data) {
    const { userId, sessionData, clientIp, isShadowBanned } = data;
    const { xpEarned, score, level, duration, totalQuestions } = sessionData;

    // 1. Persistir sesión histórico (Envolver en try-catch para no bloquear el ranking)
    try {
        await ArenaSession.create({
            userId,
            level,
            score: score || 0,
            xpEarned: xpEarned || 0,
            correctAnswers: score || 0, // En el frontend score es el conteo de aciertos
            totalQuestions: totalQuestions || 5,
            duration: duration || 60,
            endedAt: new Date(),
            clientIp
        });
    } catch (err) {
        logger.error(`[Worker] ⚠️ Error al crear ArenaSession (No crítico para ranking): ${err.message}`);
    }

    // 2. Si NO es shadowBanned, actualizar rankings y XP real
    if (!isShadowBanned) {
        // Actualizar MongoDB (XP y RankPoints)
        const user = await User.findById(userId);
        if (user) {
            // Asegurar que el objeto arena existe
            if (!user.arena) user.arena = {};
            if (!user.arena.completedChallenges) user.arena.completedChallenges = [];

            // Lógica Anti-Farming: Filtrar solo desafíos nuevos
            const correctQuestionIds = sessionData.correctQuestionIds || [];
            const newCorrectIds = correctQuestionIds.filter(id =>
                !user.arena.completedChallenges.map(c => c.toString()).includes(id.toString())
            );

            // Calcular proporción de recompensa
            const totalCorrect = correctQuestionIds.length;
            const newCorrectCount = newCorrectIds.length;

            let effectiveXP = 0;
            let effectiveScore = 0;

            if (totalCorrect > 0) {
                if (newCorrectCount > 0) {
                    // Recompensa completa por nuevos desafíos
                    const ratio = newCorrectCount / totalCorrect;
                    effectiveXP = Math.round((Number(xpEarned) || 0) * ratio);
                    effectiveScore = newCorrectCount;
                } else {
                    // Recompensa de "Entrenamiento" (50%) para desafíos repetidos para que no se vea el reset a cero
                    effectiveXP = Math.round((Number(xpEarned) || 0) * 0.5);
                    effectiveScore = 0; // El ranking solo sube con desafíos nuevos
                }
            }

            // Validar valores numéricos para evitar NaN
            const currentXP = Number(user.arena.xp) || 0;
            const currentRankPoints = Number(user.arena.rankPoints) || 0;

            user.arena.xp = currentXP + effectiveXP;
            user.arena.rankPoints = currentRankPoints + effectiveScore;
            user.arena.lastGameAt = new Date();

            // Actualizar estadísticas de participación
            user.arena.gamesPlayed = (user.arena.gamesPlayed || 0) + 1;
            if (effectiveXP > 0) {
                user.arena.wins = (user.arena.wins || 0) + 1;
            }

            // Añadir nuevos desafíos a la lista de completados
            if (newCorrectIds.length > 0) {
                user.arena.completedChallenges.push(...newCorrectIds);
            }

            logger.info(`[Worker] 🛡️ Anti-Farming - Usuario ${userId}: Acertados: ${totalCorrect}, Nuevos: ${newCorrectCount}. Recompensa: +${effectiveXP} XP. Stats: ${user.arena.wins}W/${user.arena.gamesPlayed}G`);

            // Sincronizar país y estado si no están cacheados en arena (Muy importante para Ranking Regional/Provincial)
            if (user.personal?.ubicacion?.pais) {
                user.arena.country = user.personal.ubicacion.pais;
            }
            const userState = user.personal?.ubicacion?.estado;

            await user.save();

            // Actualizar Redis (Ranking Jerárquico: Global, País, Estado)
            const userCountry = user.arena.country;

            await rankingService.updateRank(userId, user.arena.rankPoints, userCountry, userState);

            // 3. Verificar Logros
            await achievementsService.checkAndUnlock(user, sessionData);

            metrics.incRankUpdate();
            metrics.incXp(xpEarned);
        }
    } else {
        console.log(`[Worker] 🕶️ ShadowBan activo para ${userId}. Ignorando actualización de ranking.`);
    }
}

/**
 * Reset Semanal (Percentiles 20%)
 */
async function performWeeklyReset() {
    const WEEKLY_KEY = 'arena:weekly';
    const totalPlayers = await redis.client.zcard(WEEKLY_KEY);
    if (totalPlayers === 0) return;

    const topLimit = Math.ceil(totalPlayers * 0.2);
    const bottomLimit = Math.ceil(totalPlayers * 0.2);

    const topPlayers = await redis.client.zrevrange(WEEKLY_KEY, 0, topLimit - 1);
    const bottomPlayers = await redis.client.zrange(WEEKLY_KEY, 0, bottomLimit - 1);

    if (topPlayers.length > 0) {
        await User.updateMany({ _id: { $in: topPlayers } }, { $set: { 'arena.league_status': 'promoted' } });
    }
    if (bottomPlayers.length > 0) {
        await User.updateMany({ _id: { $in: bottomPlayers } }, { $set: { 'arena.league_status': 'demoted' } });
    }

    await redis.client.del(WEEKLY_KEY);
    console.log('[Worker] 🔄 Ranking semanal reseteado.');
}

// Exportar cola y función de inicio
module.exports = { rankingQueue, startWorker };
