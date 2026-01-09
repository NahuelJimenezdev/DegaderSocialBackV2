const express = require('express');
const router = express.Router();
const favoritosController = require('../controllers/favoritosController');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Toggle usuario favorito
router.post('/usuario/:userId', favoritosController.toggleFavoriteUser);

// Obtener usuarios favoritos
router.get('/usuarios', favoritosController.getFavoriteUsers);

// Verificar si un usuario es favorito
router.get('/usuario/:userId/check', favoritosController.checkIsFavorite);

module.exports = router;
