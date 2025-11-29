const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  solicitarUnirse,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  obtenerMiEstado
} = require('../controllers/fundacionController');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /api/fundacion/solicitar
 * Usuario solicita unirse a la fundación
 */
router.post('/solicitar', solicitarUnirse);

/**
 * GET /api/fundacion/mi-estado
 * Obtener estado de aprobación del usuario actual
 */
router.get('/mi-estado', obtenerMiEstado);

/**
 * GET /api/fundacion/solicitudes
 * Listar solicitudes pendientes (solo para superiores)
 */
router.get('/solicitudes', listarSolicitudes);

/**
 * PUT /api/fundacion/aprobar/:userId
 * Aprobar solicitud de un usuario
 */
router.put('/aprobar/:userId', aprobarSolicitud);

/**
 * PUT /api/fundacion/rechazar/:userId
 * Rechazar solicitud de un usuario
 */
router.put('/rechazar/:userId', rechazarSolicitud);

module.exports = router;
