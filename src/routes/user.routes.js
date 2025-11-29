const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadAvatar, uploadBanner, handleUploadError } = require('../middleware/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas específicas (deben ir ANTES de las rutas con parámetros dinámicos)
router.get('/search', userController.searchUsers);
router.put('/profile', userController.updateProfile);
router.put('/avatar', uploadAvatar, handleUploadError, userController.uploadAvatar);
router.delete('/deactivate', userController.deactivateAccount);

// Rutas de posts guardados (ANTES de /:id)
router.post('/save-post/:postId', userController.toggleSavePost);
router.get('/saved-posts', userController.getSavedPosts);

// Rutas de usuarios con parámetros dinámicos (deben ir DESPUÉS de las rutas específicas)
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/stats', userController.getUserStats);
router.post('/:id/avatar', uploadAvatar, handleUploadError, userController.uploadAvatar);
router.post('/:id/banner', uploadBanner, handleUploadError, userController.uploadBanner);
router.delete('/:id/banner', userController.deleteBanner);

module.exports = router;
