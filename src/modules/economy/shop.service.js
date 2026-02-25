const User = require('../../models/User.model');
const eventBus = require('../../infrastructure/events/eventBus');

class ShopService {
    /**
     * Procesa la compra de un ítem
     */
    async buyItem(userId, itemId, price, currency = 'coins') {
        const user = await User.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        if (user.economy[currency] < price) {
            throw new Error('Saldo insuficiente');
        }

        // 1. Descontar saldo y añadir item
        user.economy[currency] -= price;
        user.economy.cosmeticItems.push(itemId);

        await user.save();

        // 2. Emitir evento para auditoría
        eventBus.emit(eventBus.constructor.Events.ECONOMY_ITEM_PURCHASED, {
            userId, itemId, price
        });

        return {
            success: true,
            newBalance: user.economy[currency]
        };
    }
}

module.exports = new ShopService();
