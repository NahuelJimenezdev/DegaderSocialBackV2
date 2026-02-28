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

    async getRandomChallenges(level, limit = 5, excludeIds = []) {
        const query = { level, 'metadata.active': true };

        if (excludeIds.length > 0) {
            const objectIds = excludeIds.map(id => {
                try {
                    return new (require('mongoose').Types.ObjectId)(id);
                } catch (e) {
                    return null;
                }
            }).filter(id => id !== null);

            if (objectIds.length > 0) {
                query._id = { $nin: objectIds };
            }
        }

        const challenges = await Challenge.aggregate([
            { $match: query },
            { $sample: { size: limit } }
        ]);

        // Si no hay suficientes preguntas no completadas, relajar la restricción
        if (challenges.length < limit && excludeIds.length > 0) {
            return await Challenge.aggregate([
                { $match: { level, 'metadata.active': true } },
                { $sample: { size: limit } }
            ]);
        }

        return challenges;
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
