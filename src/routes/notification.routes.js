const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de notificaciones — REGLA: rutas estáticas ANTES que dinámicas (:id)

// GET — Estáticas primero
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/', notificationController.getAllNotifications);
router.get('/:id', notificationController.getNotificationById);

// PUT — Estáticas primero
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.put('/:id/delivered', notificationController.markAsDelivered);

// POST
router.post('/register-token', notificationController.registerDeviceToken);

// DELETE — Estáticas primero
router.delete('/clear-read', notificationController.clearReadNotifications);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
