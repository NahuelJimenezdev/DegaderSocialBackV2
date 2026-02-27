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
            // --- PROGRESIÓN POR PUNTOS (XP) ---
            ...this._generateXpAchievements(),
            // --- RACHAS ---
            ...this._generateStreakAchievements(),
            // --- CANTIDAD TOTAL ---
            ...this._generateTotalAchievements(),
            // --- VELOCIDAD Y PRECISIÓN ---
            ...this._generateSpeedAndPerfectAchievements(),
            // --- PERSISTENCIA ---
            ...this._generateDaysStreakAchievements(),
            // --- OTROS ---
            first_victory: {
                id: 'first_victory',
                check: async (user, sessionData) => sessionData.score > 0
            }
        };
    }

    _generateXpAchievements() {
        const points = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 850, 950, 1000, 1100, 1150, 1200];
        const achievements = {};
        points.forEach(p => {
            const id = p === 1200 ? 'easy_master' : `points_${p}`;
            achievements[id] = {
                id,
                check: async (user) => (user.arena?.xp || 0) >= p
            };
        });
        return achievements;
    }

    _generateStreakAchievements() {
        const streaks = [1, 3, 5, 7, 10, 12, 15, 18, 20, 25];
        const achievements = {};
        streaks.forEach(s => {
            const id = s === 1 ? 'first_step' : `streak_${s}`;
            achievements[id] = {
                id,
                check: async (user, sessionData) => (sessionData.bestStreak || 0) >= s
            };
        });
        return achievements;
    }

    _generateTotalAchievements() {
        const totals = [10, 25, 50, 75, 100, 150, 200];
        const achievements = {};
        totals.forEach(t => {
            const id = `total_${t}`;
            achievements[id] = {
                id,
                check: async (user) => {
                    const sessions = await ArenaSession.find({ userId: user._id }, 'score');
                    const totalCorrect = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
                    return totalCorrect >= t;
                }
            };
        });
        return achievements;
    }

    _generateSpeedAndPerfectAchievements() {
        return {
            fast_5: { id: 'fast_5', check: async (user, sessionData) => (sessionData.fastestAnswer || 999) < 5 },
            fast_3: { id: 'fast_3', check: async (user, sessionData) => (sessionData.fastestAnswer || 999) < 3 },
            fast_2: { id: 'fast_2', check: async (user, sessionData) => (sessionData.fastestAnswer || 999) < 2 },
            perfect_5: { id: 'perfect_5', check: async (user, sessionData) => sessionData.totalQuestions >= 5 && sessionData.score === sessionData.totalQuestions },
            perfect_10: { id: 'perfect_10', check: async (user, sessionData) => sessionData.totalQuestions >= 10 && sessionData.score === sessionData.totalQuestions }
        };
    }

    _generateDaysStreakAchievements() {
        const days = [2, 3, 5];
        const achievements = {};
        days.forEach(d => {
            const id = `daily_${d}`;
            achievements[id] = {
                id,
                check: async (user) => {
                    // Lógica simplificada: Buscar sesiones en los últimos 'd' días naturales
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    let consecutiveDays = 0;
                    for (let i = 0; i < d; i++) {
                        const targetDate = new Date(today);
                        targetDate.setDate(today.getDate() - i);
                        const nextDate = new Date(targetDate);
                        nextDate.setDate(targetDate.getDate() + 1);

                        const sessionOnDay = await ArenaSession.findOne({
                            userId: user._id,
                            endedAt: { $gte: targetDate, $lt: nextDate }
                        });

                        if (sessionOnDay) consecutiveDays++;
                        else break;
                    }
                    return consecutiveDays >= d;
                }
            };
        });
        return achievements;
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
