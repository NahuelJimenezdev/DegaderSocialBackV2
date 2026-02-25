const User = require('../../../models/User.model');
const Challenge = require('../../../models/challenge.model');
const ArenaSession = require('../../../models/arenaSession.model');

class ArenaRepository {
    async findUserById(userId) {
        return await User.findById(userId);
    }

    async updateUserArena(userId, arenaData, subscriptionData = null) {
        const update = { $set: { arena: arenaData } };
        if (subscriptionData) {
            update.$set.subscription = subscriptionData;
        }
        return await User.findByIdAndUpdate(userId, update, { new: true });
    }

    async getRandomChallenges(level, limit = 5) {
        return await Challenge.aggregate([
            { $match: { level, 'metadata.active': true } },
            { $sample: { size: limit } }
        ]);
    }

    async createSession(sessionData) {
        return await ArenaSession.create(sessionData);
    }

    async getLastSessions(userId, limit = 10) {
        return await ArenaSession.find({ userId })
            .sort({ endedAt: -1 })
            .limit(limit);
    }
}

module.exports = new ArenaRepository();
