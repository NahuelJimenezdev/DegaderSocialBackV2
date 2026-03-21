const eventBus = require('../../infrastructure/events/eventBus');
const User = require('../../models/User.model');

class RewardsService {
    /**
     * Procesa la entrega de recompensas post-partida
     */
    async grantGameRewards(userId, { coins = 0, xp = 0 }) {
        const user = await User.findById(userId);
        if (!user) return;

        // Aplicar multiplicador si hay boost activo
        let finalXp = xp;
        if (user.economy.xpBoostActiveUntil && user.economy.xpBoostActiveUntil > new Date()) {
            finalXp *= 2;
        }

        user.economy.coins += coins;
        user.arena.xp += finalXp;

        await user.save();

        eventBus.emit(eventBus.constructor.Events.ECONOMY_REWARD_GRANTED, {
            userId, coins, xp: finalXp
        });

        return { coins, xp: finalXp };
    }
}

module.exports = new RewardsService();
