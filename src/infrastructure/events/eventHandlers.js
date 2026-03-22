const eventBus = require('./eventBus');
const { rankingQueue } = require('../../workers/ranking.worker');
const auditLog = require('../../models/arenaAuditLog.model');

/**
 * Inicializa los escuchadores del EventBus
 */
const initializeEventHandlers = () => {
    const events = eventBus.constructor.Events;

    // Al completar una partida
    eventBus.on(events.ARENA_GAME_COMPLETED, async (data) => {
        try {
            // 1. Añadir a la cola de BullMQ para procesamiento pesado
            await rankingQueue.add('process-game-result', data, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 }
            });
        } catch (error) {
            console.error('❌ Error al encolar resultado de partida:', error.message);
        }
    });

    // Registro de Shadow-ban en Audit Log
    eventBus.on(events.ARENA_USER_SHADOWBANNED, async ({ userId, reason }) => {
        await auditLog.create({
            userId,
            action: 'SHADOW_BAN',
            level: 'warn',
            metadata: { reason }
        });
    });

    // Registro de Compras
    eventBus.on(events.ECONOMY_ITEM_PURCHASED, async ({ userId, itemId, price }) => {
        await auditLog.create({
            userId,
            action: 'PURCHASE',
            metadata: { itemId, price }
        });
    });
};

module.exports = { initializeEventHandlers };
