const { Router } = require('express');
const amistadController = require('../controllers/amistad.controller');
const { verifyToken } = require('../middlewares/auth');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.post('/request', amistadController.sendRequest);
router.post('/:id/accept', amistadController.acceptRequest);
router.post('/:id/reject', amistadController.rejectRequest);
router.get('/friends', amistadController.getFriends);
router.get('/pending', amistadController.getPendingRequests);
router.delete('/:friendId', amistadController.removeFriend);

module.exports = router;
