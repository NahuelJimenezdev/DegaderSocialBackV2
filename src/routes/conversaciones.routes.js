const { Router } = require('express');
const conversacionController = require('../controllers/conversacion.controller');
const { verifyToken } = require('../middlewares/auth');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get('/', conversacionController.getUserConversations);
router.get('/unread-count', conversacionController.getUnreadCount);
router.get('/:id', conversacionController.getById);
router.get('/user/:userId', conversacionController.getOrCreate);
router.post('/:id/message', conversacionController.sendMessage);
router.put('/:id/read', conversacionController.markAsRead);

module.exports = router;
