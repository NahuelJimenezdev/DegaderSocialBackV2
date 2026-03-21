const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkModerator } = require('../middleware/checkModerator.middleware');
const adminController = require('../controllers/adminController');

// Todas las rutas requieren autenticación Y permisos de moderador
router.use(authenticate);
router.use(checkModerator);

// Gestión de usuarios suspendidos
router.get('/suspended-users', adminController.getSuspendedUsers);
router.post('/users/:userId/lift-suspension', adminController.liftSuspension);
router.get('/users/:userId/reports-history', adminController.getUserReportsHistory);

// Gestión de tickets
router.get('/tickets', adminController.getAllTickets);
router.post('/tickets/:id/resolve', adminController.resolveTicket);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
