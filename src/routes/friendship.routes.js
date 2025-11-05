const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de amistades
router.post('/request', friendshipController.sendFriendRequest);
router.get('/pending', friendshipController.getPendingRequests);
router.get('/friends', friendshipController.getFriends);
router.get('/status/:userId', friendshipController.getFriendshipStatus);

// Acciones sobre solicitudes
router.post('/:id/accept', friendshipController.acceptFriendRequest);
router.post('/:id/reject', friendshipController.rejectFriendRequest);

// Eliminar amistad
router.delete('/:friendId', friendshipController.removeFriend);

module.exports = router;
