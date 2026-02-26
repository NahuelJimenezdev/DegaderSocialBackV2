const User = require('../../../models/User.model');
const ArenaSession = require('../../../models/arenaSession.model');
const eventBus = require('../../../infrastructure/events/eventBus');
const logger = require('../../../config/logger');

class AchievementsService {
    /**
     * Define los criterios de los logros
     */
    get ACHIEVEMENTS_DEFINITIONS() {
        return {
            first_win: {
                id: 'first_win',
                check: async (user, sessionData) => sessionData.score > 0
            },
            streak_5: {
                id: 'streak_5',
                check: async (user, sessionData) => sessionData.score >= 5 // 5 aciertos en una sesión
            },
            expert_win: {
                id: 'expert_win',
                check: async (user, sessionData) => sessionData.level === 'experto' && sessionData.score > 0
            },
            loyal_user: {
                id: 'loyal_user',
                check: async (user) => {
                    const count = await ArenaSession.countDocuments({ userId: user._id });
                    return count >= 10;
                }
            }
        };
    }

    /**
     * Verifica y desbloquea nuevos logros para el usuario
     */
    async checkAndUnlock(user, sessionData) {
        if (!user.arena) user.arena = {};
        if (!user.arena.achievements) user.arena.achievements = [];

        const currentAchievements = new Set(user.arena.achievements);
        let newlyUnlocked = [];

        logger.info(`[Achievements] 🔍 Verificando logros para ${user.username || user._id}. Actuales: ${user.arena.achievements.length}`);

        for (const [key, definition] of Object.entries(this.ACHIEVEMENTS_DEFINITIONS)) {
            try {
                if (!currentAchievements.has(definition.id)) {
                    const isUnlocked = await definition.check(user, sessionData);
                    if (isUnlocked) {
                        newlyUnlocked.push(definition.id);
                        user.arena.achievements.push(definition.id);
                        logger.info(`[Achievements] 🏆 LOGRO DESBLOQUEADO: ${definition.id}`);
                    }
                }
            } catch (err) {
                logger.error(`[Achievements] ❌ Error verificando logro ${key}: ${err.message}`);
            }
        }

        if (newlyUnlocked.length > 0) {
            // Emitir evento para sockets pero NO guardar aquí (se guarda en arena.service.js)
            eventBus.emit('arena:achievements:unlocked', {
                userId: user._id,
                achievements: newlyUnlocked
            });
        }

        return newlyUnlocked;
    }
}

module.exports = new AchievementsService();
