const express = require('express');
const router = express.Router();
const economyService = require('./economy.service');

// Obtener items de la tienda (Configuración estática por ahora)
router.get('/shop/items', (req, res) => {
    res.json([
        { id: 'boost_xp', name: 'XP Boost x2 (1h)', price: 100, currency: 'gems' },
        { id: 'skin_warrior', name: 'Skin: Guerrero del Pacto', price: 500, currency: 'coins' }
    ]);
});

// Comprar un item
router.post('/shop/buy', async (req, res) => {
    try {
        const { itemId, price, currency } = req.body;
        const result = await economyService.purchaseItem(req.user.id, { id: itemId, price, currency });
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
