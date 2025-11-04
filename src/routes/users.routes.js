const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth');
const { uploadAvatar } = require('../middlewares/upload');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get('/', userController.getAll);
router.get('/search', userController.search);
router.get('/:id', userController.getById);
router.put('/profile', userController.updateProfile);
router.put('/avatar', uploadAvatar, userController.updateAvatar);
router.delete('/deactivate', userController.deactivate);

module.exports = router;
