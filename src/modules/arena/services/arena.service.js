const arenaRepository = require('../repositories/arena.repository');
const eventBus = require('../../../infrastructure/events/eventBus');
const metrics = require('../../../infrastructure/metrics/metrics.service');
const achievementsService = require('./achievements.service');
const logger = require('../../../config/logger');

class ArenaService {
    /**
     * Procesa el final de una partida de forma síncrona para garantizar persistencia
     */
    async processSessionResult(userId, sessionData, clientIp) {
        const user = await arenaRepository.findUserById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        const { level, xpEarned, score, correctQuestionIds = [] } = sessionData;

        // 1. Lógica Anti-Farming y cálculo de XP real (Síncrono)
        const currentCompletedIds = user.arena.completedChallenges.map(id => id.toString());
        const newCorrectIds = correctQuestionIds.filter(id => !currentCompletedIds.includes(id.toString()));

        let effectiveXP = 0;
        let effectiveScore = 0;

        if (correctQuestionIds.length > 0) {
            if (newCorrectIds.length > 0) {
                const ratio = newCorrectIds.length / correctQuestionIds.length;
                effectiveXP = Math.round((Number(xpEarned) || 0) * ratio);
                effectiveScore = newCorrectIds.length;
            } else {
                // Bono de entrenamiento (50%) para evitar que el usuario sienta que pierde tiempo
                effectiveXP = Math.round((Number(xpEarned) || 0) * 0.5);
                effectiveScore = 0;
            }
        }

        // 2. Actualizar Usuario en MongoDB inmediatamente (Garantiza persistencia tras recarga)
        user.arena.xp = (Number(user.arena.xp) || 0) + effectiveXP;
        user.arena.rankPoints = (Number(user.arena.rankPoints) || 0) + effectiveScore;
        user.arena.lastGameAt = new Date();
        user.arena.gamesPlayed = (user.arena.gamesPlayed || 0) + 1;
        if (effectiveXP > 0) user.arena.wins = (user.arena.wins || 0) + 1;

        if (newCorrectIds.length > 0) {
            user.arena.completedChallenges.push(...newCorrectIds);
        }

        // Sincronizar ubicación para ranking
        if (user.personal?.ubicacion?.pais) user.arena.country = user.personal.ubicacion.pais;

        // 3. Registrar Sesión Histórica (Síncrono)
        await arenaRepository.createSession({
            userId,
            level: sessionData.level,
            score: sessionData.score,
            xpEarned: effectiveXP,
            totalQuestions: sessionData.totalQuestions,
            duration: sessionData.duration,
            correctQuestionIds: sessionData.correctQuestionIds,
            endedAt: new Date()
        });

        // 4. Verificar Logros (Síncrono)
        const unlocked = await achievementsService.checkAndUnlock(user, sessionData);

        await user.save();
        logger.info(`[ArenaService] ✅ Resultado persistido para ${userId}: +${effectiveXP} XP. Total: ${user.arena.xp}`);

        // 4. Emitir evento para el worker (Ranking en Redis - Sigue siendo asíncrono)
        eventBus.emit(eventBus.constructor.Events.ARENA_GAME_COMPLETED, {
            userId,
            rankPoints: user.arena.rankPoints, // Enviamos el total ya actualizado
            clientIp,
            country: user.arena.country,
            state: user.personal?.ubicacion?.estado
        });

        metrics.incGames(level);

        return {
            success: true,
            xpEarned: effectiveXP,
            newLevel: user.arena.level,
            unlockedAchievements: unlocked,
            stats: {
                wins: user.arena.wins,
                gamesPlayed: user.arena.gamesPlayed,
                totalXP: user.arena.xp
            }
        };
    }

    async applyShadowBan(userId, reason) {
        // ... (keep as is)
        const user = await arenaRepository.findUserById(userId);
        if (user) {
            user.arena.antiCheatFlags.shadowBanned = true;
            await user.save();
            metrics.incShadowBan();
            eventBus.emit(eventBus.constructor.Events.ARENA_USER_SHADOWBANNED, { userId, reason });
        }
    }
}

module.exports = new ArenaService();
