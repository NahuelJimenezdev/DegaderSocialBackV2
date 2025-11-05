const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadMessageFile, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de conversaciones
router.get('/', conversationController.getAllConversations);
router.get('/unread-count', conversationController.getUnreadCount);
router.get('/:id', conversationController.getConversationById);

router.post('/with/:userId', conversationController.getOrCreateConversation);
router.post('/:id/message', uploadMessageFile, handleUploadError, conversationController.sendMessage);

router.put('/:id/read', conversationController.markAsRead);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;
