const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');
const { validateUser } = require('../middlewares/validators');

const router = Router();

// Rutas públicas
router.post('/register', validateUser, authController.register);
router.post('/login', authController.login);

// Rutas protegidas
router.get('/profile', verifyToken, authController.getCurrentUser);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
