const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    createUserWithRole,
    updateUserRole,
    getUserById,
    deleteUser,
    logSecurityAlert
} = require('../controllers/founderController');
const { authenticate } = require('../middleware/auth.middleware');
const { isFounder } = require('../middleware/isFounder.middleware');

// Ruta pública para alertas de seguridad (solo requiere autenticación básica)
router.post('/security-alert', authenticate, logSecurityAlert);

// Todas las rutas SIGUIENTES requieren ser Founder
router.use(authenticate, isFounder);

/**
 * @route   GET /api/founder/users
 * @desc    Obtener todos los usuarios con filtros
 * @access  Private (Founder only)
 */
router.get('/users', getAllUsers);

/**
 * @route   POST /api/founder/users
 * @desc    Crear usuario con rol específico
 * @access  Private (Founder only)
 */
router.post('/users', createUserWithRole);

/**
 * @route   GET /api/founder/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private (Founder only)
 */
router.get('/users/:id', getUserById);

/**
 * @route   PUT /api/founder/users/:id/role
 * @desc    Actualizar rol de usuario
 * @access  Private (Founder only)
 */
router.put('/users/:id/role', updateUserRole);

/**
 * @route   DELETE /api/founder/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (Founder only)
 */
router.delete('/users/:id', deleteUser);

module.exports = router;
