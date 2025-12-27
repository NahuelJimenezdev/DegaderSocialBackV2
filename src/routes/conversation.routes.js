const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadMessageFile, uploadConversationFiles, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de conversaciones
router.get('/', conversationController.getAllConversations);
router.get('/unread-count', conversationController.getUnreadCount);
router.get('/pending-count', conversationController.getPendingCount);
router.get('/:id', conversationController.getConversationById);

router.post('/with/:userId', conversationController.getOrCreateConversation);
// Usar uploadConversationFiles para múltiples archivos (R2)
router.post('/:id/message', uploadConversationFiles, handleUploadError, conversationController.sendMessage);

router.put('/:id/read', conversationController.markAsRead);
router.put('/:id/archive', conversationController.archiveConversation);
router.put('/:id/clear', conversationController.clearConversation);
router.put('/:id/star', conversationController.starConversation);
router.put('/:id/accept-request', conversationController.acceptMessageRequest);
router.put('/:id/decline-request', conversationController.declineMessageRequest);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;
