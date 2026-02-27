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
        logger.info(`[ArenaService] 🏁 Iniciando proceso para usuario: ${userId}`);
        const user = await arenaRepository.findUserById(userId);
        if (!user) {
            logger.error(`[ArenaService] ❌ Usuario no encontrado: ${userId}`);
            throw new Error('Usuario no encontrado');
        }

        // Asegurar inicialización profunda del objeto arena
        if (!user.arena) user.arena = {};
        if (!user.arena.completedChallenges) user.arena.completedChallenges = [];

        const { level, xpEarned, score, correctQuestionIds = [] } = sessionData;
        logger.info(`[ArenaService] 📥 Datos recibidos: Score=${score}, XPEarned=${xpEarned}, Questions=${correctQuestionIds.length}`);

        // 1. Lógica Anti-Farming segura
        const currentCompletedIds = (user.arena.completedChallenges || []).map(id => id.toString());
        const newCorrectIds = correctQuestionIds.filter(id => id && !currentCompletedIds.includes(id.toString()));

        let effectiveXP = 0;
        let effectiveScore = 0;

        if (correctQuestionIds.length > 0) {
            if (newCorrectIds.length > 0) {
                const ratio = newCorrectIds.length / correctQuestionIds.length;
                effectiveXP = Math.round((Number(xpEarned) || 0) * ratio);
                effectiveScore = newCorrectIds.length;
                logger.info(`[ArenaService] ✨ Recompensa Completa: +${effectiveXP} XP (${newCorrectIds.length} nuevos)`);
            } else {
                effectiveXP = Math.round((Number(xpEarned) || 0) * 0.5);
                effectiveScore = 0;
                logger.info(`[ArenaService] 🔄 Recompensa Entrenamiento (50%): +${effectiveXP} XP (0 nuevos)`);
            }
        }

        // 2. Actualización de contadores con safeguards (Number || 0)
        user.arena.xp = (Number(user.arena.xp) || 0) + effectiveXP;
        user.arena.rankPoints = (Number(user.arena.rankPoints) || 0) + effectiveScore;
        user.arena.lastGameAt = new Date();
        user.arena.gamesPlayed = (Number(user.arena.gamesPlayed) || 0) + 1;
        if (effectiveXP > 0) user.arena.wins = (Number(user.arena.wins) || 0) + 1;

        if (newCorrectIds.length > 0) {
            user.arena.completedChallenges.push(...newCorrectIds);
        }

        // Sincronizar ubicación
        if (user.personal?.ubicacion?.pais) {
            user.arena.country = user.personal.ubicacion.pais;
        }

        // 3. Registrar Sesión Histórica
        try {
            logger.info(`[ArenaService] 📝 Registrando sesión histórica...`);
            await arenaRepository.createSession({
                userId,
                level,
                score,
                correctAnswers: score, // Campo requerido por el modelo ArenaSession
                xpEarned: effectiveXP,
                totalQuestions: sessionData.totalQuestions || correctQuestionIds.length,
                duration: sessionData.duration || 60,
                bestStreak: sessionData.bestStreak || 0,
                fastestAnswer: sessionData.fastestAnswer || 999,
                correctQuestionIds,
                endedAt: new Date()
            });
        } catch (err) {
            logger.error(`[ArenaService] ⚠️ Error al registrar sesión: ${err.message}`);
        }

        // 4. Verificar Logros (Opcional, no debe bloquear el XP)
        let unlocked = [];
        try {
            logger.info(`[ArenaService] 🏆 Verificando logros...`);
            unlocked = await achievementsService.checkAndUnlock(user, sessionData);
        } catch (err) {
            logger.error(`[ArenaService] ⚠️ Error en verificación de logros: ${err.message}`);
        }

        try {
            await user.save();
            logger.info(`[ArenaService] ✅ ÉXITO: Datos persistidos para ${userId}. Total XP: ${user.arena.xp}`);
        } catch (err) {
            logger.error(`[ArenaService] ❌ ERROR AL GUARDAR USUARIO: ${err.message}`);
            throw err;
        }
        logger.info(`[ArenaService] ✅ Éxito síncrono para ${userId}: +${effectiveXP} XP. Total: ${user.arena.xp}`);

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
