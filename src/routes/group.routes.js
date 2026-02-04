const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadGroupImage, uploadGroupAttachments, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de grupos
router.get('/', groupController.getAllGroups);
router.get('/:id', groupController.getGroupById);
router.get('/:id/members', groupController.getGroupMembers);

router.post('/', uploadGroupImage, handleUploadError, groupController.createGroup);
router.put('/:id', uploadGroupImage, handleUploadError, groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

// Avatar del grupo
router.post('/:id/avatar', uploadGroupImage, handleUploadError, groupController.uploadGroupAvatar);
router.delete('/:id/avatar', groupController.deleteGroupAvatar);

// Acciones de grupo
router.post('/:id/join', groupController.joinGroup);
router.post('/:id/leave', groupController.leaveGroup);

// Solicitudes de unión
router.post('/:id/join/:requestId/approve', groupController.approveJoinRequest);
router.post('/:id/join/:requestId/reject', groupController.rejectJoinRequest);

// Gestión de miembros
router.post('/:id/members/:memberId/role', groupController.updateMemberRole);
router.delete('/:id/members/:memberId', groupController.removeMember);
router.post('/:id/transfer', groupController.transferOwnership);

// Mensajes del grupo
router.get('/:id/messages', groupController.getMessages);
router.post('/:id/messages', groupController.sendMessage);
router.post('/:id/messages/upload', uploadGroupAttachments, handleUploadError, groupController.sendMessageWithFiles);
router.delete('/:id/messages/:messageId', groupController.deleteMessage);
router.post('/:id/messages/:messageId/reactions', groupController.reactToMessage);
router.put('/:id/messages/:messageId/star', groupController.toggleStarMessage);
router.put('/:id/messages/:messageId/read', groupController.markMessageAsRead);

// Multimedia y Archivos
router.get('/:id/multimedia', groupController.getMultimedia);
router.get('/:id/archivos', groupController.getArchivos);

// Destacados y enlaces
router.get('/:id/destacados', groupController.getDestacados);
router.get('/:id/enlaces', groupController.getEnlaces);

// Configuración de notificaciones
router.post('/:id/notifications/settings', groupController.updateGroupNotificationSettings);

module.exports = router;
