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

// 🛡️ Agregar manejador de error para evitar que crashee si Redis falla
rankingQueue.on('error', (err) => {
    console.error(`[BullMQ] ❌ Error en la Cola ranking-tasks: ${err.message}`);
});

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
    worker.on('error', (err) => {
        console.error(`[BullMQ] ❌ Error en el Worker: ${err.message}`);
    });

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

    // 2. Si NO es shadowBanned, actualizar rankings en Redis
    if (!isShadowBanned) {
        // OPTIMIZACIÓN: Solo lo necesario para Arena (Evita fetch de 23KB)
        const user = await User.findById(userId).select('arena personal.ubicacion');
        if (user) {
            // Sincronizar país y estado si no están cacheados en arena
            if (!user.arena) user.arena = {}; 
            
            let needsSave = false;
            if (user.personal?.ubicacion?.pais && user.arena.country !== user.personal.ubicacion.pais) {
                user.arena.country = user.personal.ubicacion.pais;
                needsSave = true;
            }

            // Only save if country/state were updated
            if (needsSave) {
                await user.save();
            }

            // Actualizar Redis (Ranking Jerárquico: Global, País, Estado)
            const userCountry = user.arena.country;
            const rankPoints = Number(user.arena.rankPoints) || 0; 

            await rankingService.updateRank(userId, rankPoints, userCountry, user.personal?.ubicacion?.estado);
            metrics.incRankUpdate();
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
