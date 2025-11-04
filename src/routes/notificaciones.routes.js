const { Router } = require('express');
const notificacionController = require('../controllers/notificacion.controller');
const { verifyToken } = require('../middlewares/auth');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get('/', notificacionController.getAll);
router.get('/unread', notificacionController.getUnread);
router.get('/unread-count', notificacionController.getUnreadCount);
router.put('/:id/read', notificacionController.markAsRead);
router.put('/read-all', notificacionController.markAllAsRead);
router.delete('/:id', notificacionController.delete);

module.exports = router;
