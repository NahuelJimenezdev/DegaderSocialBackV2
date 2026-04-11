const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

const { registerValidation, loginValidation } = require('../middleware/validators/auth.validator');

// Rutas públicas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Rutas protegidas
router.get('/profile', authenticate, authController.getProfile);
router.get('/suspension-info', authenticate, authController.getSuspensionInfo);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/admin/reset-password', authenticate, isAdmin, authController.adminResetPassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
