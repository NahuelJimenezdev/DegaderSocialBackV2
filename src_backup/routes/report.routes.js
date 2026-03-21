const express = require('express');
const router = express.Router();
const {
    createReport,
    getUserReports,
    getAllReports,
    getReportById,
    assignReportToSelf,
    updateReportStatus,
    takeModeratorAction,
    getModeratorStats,
    getFounderAuditStats,
    escalateOrRevertCase
} = require('../controllers/reportController');
const {
    authenticate,
    isTrustAndSafety,
    isFounder,
    isTrustAndSafetyOrFounder
} = require('../middleware/auth.middleware');

// ==========================================
// 🔹 RUTAS PARA USUARIOS AUTENTICADOS
// ==========================================

/**
 * @route   POST /api/reports
 * @desc    Crear un nuevo reporte
 * @access  Private (usuario autenticado)
 */
router.post('/', authenticate, createReport);

/**
 * @route   GET /api/reports/my-reports
 * @desc    Obtener reportes creados por el usuario actual
 * @access  Private (usuario autenticado)
 */
router.get('/my-reports', authenticate, getUserReports);

// ==========================================
// 🔹 RUTAS PARA MODERADORES (Trust & Safety)
// ==========================================

/**
 * @route   GET /api/reports/moderator/stats
 * @desc    Obtener estadísticas para el dashboard de moderación
 * @access  Private (Trust & Safety)
 */
router.get('/moderator/stats', authenticate, isTrustAndSafety, getModeratorStats);

/**
 * @route   GET /api/reports/moderator/list
 * @desc    Listar todos los reportes con filtros
 * @access  Private (Trust & Safety)
 */
router.get('/moderator/list', authenticate, isTrustAndSafety, getAllReports);

/**
 * @route   GET /api/reports/moderator/:id
 * @desc    Obtener detalle completo de un reporte
 * @access  Private (Trust & Safety)
 */
router.get('/moderator/:id', authenticate, isTrustAndSafety, getReportById);

/**
 * @route   PUT /api/reports/moderator/:id/assign
 * @desc    Asignar reporte al moderador actual
 * @access  Private (Trust & Safety)
 */
router.put('/moderator/:id/assign', authenticate, isTrustAndSafety, assignReportToSelf);

/**
 * @route   PUT /api/reports/moderator/:id/status
 * @desc    Actualizar estado del reporte
 * @access  Private (Trust & Safety)
 */
router.put('/moderator/:id/status', authenticate, isTrustAndSafety, updateReportStatus);

/**
 * @route   POST /api/reports/moderator/:id/action
 * @desc    Aplicar acción de moderación
 * @access  Private (Trust & Safety)
 */
router.post('/moderator/:id/action', authenticate, isTrustAndSafety, takeModeratorAction);

// ==========================================
// 🔹 RUTAS PARA FOUNDER
// ==========================================

/**
 * @route   GET /api/reports/founder/audit
 * @desc    Obtener estadísticas de auditoría
 * @access  Private (Founder)
 */
router.get('/founder/audit', authenticate, isFounder, getFounderAuditStats);

/**
 * @route   PUT /api/reports/founder/:id/escalate
 * @desc    Escalar o revertir un caso
 * @access  Private (Founder)
 */
router.put('/founder/:id/escalate', authenticate, isFounder, escalateOrRevertCase);

module.exports = router;
