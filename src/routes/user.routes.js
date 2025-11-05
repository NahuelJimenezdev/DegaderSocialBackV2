const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadAvatar, uploadBanner, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de usuarios
router.get('/', userController.getAllUsers);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/stats', userController.getUserStats);

// Rutas de perfil
router.put('/profile', userController.updateProfile);
router.put('/avatar', uploadAvatar, handleUploadError, userController.uploadAvatar);
router.post('/:id/avatar', uploadAvatar, handleUploadError, userController.uploadAvatar);
router.post('/:id/banner', uploadBanner, handleUploadError, userController.uploadBanner);
router.delete('/:id/banner', userController.deleteBanner);
router.delete('/deactivate', userController.deactivateAccount);

// Rutas de posts guardados
router.post('/save-post/:postId', userController.toggleSavePost);
router.get('/saved-posts', userController.getSavedPosts);

module.exports = router;
