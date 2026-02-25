const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(20);
    }

    emit(eventName, data) {
        console.log(`📡 Evento Emitido: ${eventName}`, data?.userId || '');
        super.emit(eventName, data);
    }

    // Nombres de eventos estandarizados
    static get Events() {
        return {
            ARENA_GAME_COMPLETED: 'arena.game.completed',
            ARENA_RANK_UPDATED: 'arena.rank.updated',
            ARENA_SEASON_CLOSED: 'arena.season.closed',
            ARENA_USER_SHADOWBANNED: 'arena.user.shadowbanned',
            ECONOMY_REWARD_GRANTED: 'economy.reward.granted',
            ECONOMY_ITEM_PURCHASED: 'economy.item.purchased'
        };
    }
}

module.exports = new EventBus();
