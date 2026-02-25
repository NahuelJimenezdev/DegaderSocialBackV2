const arenaRepository = require('../repositories/arena.repository');
const eventBus = require('../../../infrastructure/events/eventBus');
const metrics = require('../../../infrastructure/metrics/metrics.service');

class ArenaService {
    /**
     * Procesa el final de una partida (Fase 2 Refinada)
     */
    async processSessionResult(userId, sessionData, clientIp) {
        const user = await arenaRepository.findUserById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        const { level, xpEarned, score } = sessionData;

        // 1. Emitir evento de partida completada
        // El worker se encargará de: ranking, XP físico, economía
        eventBus.emit(eventBus.constructor.Events.ARENA_GAME_COMPLETED, {
            userId,
            sessionData,
            clientIp,
            isShadowBanned: user.arena?.antiCheatFlags?.shadowBanned || false
        });

        // 2. Métricas rápidas
        metrics.incGames(level);

        return {
            success: true,
            message: 'Resultado recibido y en proceso de validación'
        };
    }

    async applyShadowBan(userId, reason) {
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
