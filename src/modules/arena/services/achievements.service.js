const User = require('../../../models/User.model');
const ArenaSession = require('../../../models/arenaSession.model');
const eventBus = require('../../../infrastructure/events/eventBus');

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
        const currentAchievements = new Set(user.arena.achievements || []);
        let newlyUnlocked = [];

        for (const [key, definition] of Object.entries(this.ACHIEVEMENTS_DEFINITIONS)) {
            if (!currentAchievements.has(definition.id)) {
                const isUnlocked = await definition.check(user, sessionData);
                if (isUnlocked) {
                    newlyUnlocked.push(definition.id);
                    user.arena.achievements.push(definition.id);
                }
            }
        }

        if (newlyUnlocked.length > 0) {
            await user.save();
            console.log(`[Achievements] 🏆 ${newlyUnlocked.length} nuevos logros para ${user._id}`);

            // Emitir evento para posible notificación en tiempo real vía sockets
            eventBus.emit('arena:achievements:unlocked', {
                userId: user._id,
                achievements: newlyUnlocked
            });
        }

        return newlyUnlocked;
    }
}

module.exports = new AchievementsService();
