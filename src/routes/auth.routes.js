const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');
const { validateUser } = require('../middlewares/validators');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = Router();

// Rutas públicas con rate limiting
router.post('/register', authLimiter, validateUser, authController.register);
router.post('/login', authLimiter, authController.login);

// Rutas protegidas
router.get('/profile', verifyToken, authController.getCurrentUser);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
