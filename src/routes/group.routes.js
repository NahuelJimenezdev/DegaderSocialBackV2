const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadGroupImage, handleUploadError } = require('../middleware/upload.middleware');

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

module.exports = router;
