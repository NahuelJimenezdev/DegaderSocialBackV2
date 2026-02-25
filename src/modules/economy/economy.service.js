const User = require('../../models/User.model');

class EconomyService {
    async getBalance(userId) {
        const user = await User.findById(userId).select('economy');
        return user ? user.economy : null;
    }

    async setXpBoost(userId, hours) {
        const until = new Date(Date.now() + hours * 3600000);
        await User.findByIdAndUpdate(userId, { 'economy.xpBoostActiveUntil': until });
        return until;
    }
}

module.exports = new EconomyService();
