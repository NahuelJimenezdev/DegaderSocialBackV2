const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de notificaciones
router.get('/', notificationController.getAllNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/unread-count', notificationController.getUnreadCount);

router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);

router.delete('/:id', notificationController.deleteNotification);
router.delete('/clear-read', notificationController.clearReadNotifications);

module.exports = router;
