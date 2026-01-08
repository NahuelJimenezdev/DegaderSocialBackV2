const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const friendshipActionsController = require('../controllers/friendshipActionsController');
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

// Acciones de gestión de amigos (ANTES de la ruta genérica /:friendId)
router.get('/con-usuario/:userId', friendshipActionsController.getFriendshipWithUser);
router.post('/:friendshipId/favorite', friendshipActionsController.toggleFavorite);
router.post('/:friendshipId/pin', friendshipActionsController.togglePin);
router.post('/:friendshipId/mute', friendshipActionsController.toggleMute);
router.delete('/:friendshipId/remove', friendshipActionsController.removeFriendship);
router.post('/:friendshipId/block', friendshipActionsController.blockUser);
router.post('/:friendshipId/unblock', friendshipActionsController.unblockUser);

// Eliminar amistad (ruta genérica al final)
router.delete('/:friendId', friendshipController.removeFriend);

module.exports = router;
