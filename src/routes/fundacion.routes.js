const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  solicitarUnirse,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  obtenerMiEstado,
  getAllSolicitudesAdmin
} = require('../controllers/fundacionController');
const { 
  getUsuariosBajoJurisdiccion,
  getUsuarioJurisdiccionDetalle 
} = require('../controllers/fundacionAdminController');

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

/**
 * GET /api/fundacion/admin/todas-solicitudes
 * Obtener TODAS las solicitudes (Solo Founder)
 */
router.get('/admin/todas-solicitudes', getAllSolicitudesAdmin);

/**
 * GET /api/fundacion/admin/usuarios-jurisdiccion
 * Listar usuarios aceptados bajo jurisdicción del director (Optimizado/Ligero)
 */
router.get('/admin/usuarios-jurisdiccion', getUsuariosBajoJurisdiccion);

/**
 * GET /api/fundacion/admin/usuario/:targetUserId
 * Obtener detalle completo para ver formularios/documentos (Bajo Demanda)
 */
router.get('/admin/usuario/:targetUserId', getUsuarioJurisdiccionDetalle);

module.exports = router;
