const express = require('express');
const router = express.Router();
const {
    obtenerMinisteriosUsuario,
    asignarMinisterio,
    actualizarMinisterio,
    removerMinisterio,
    gestionarMiembroMinisterio,
    obtenerMiembrosPorMinisterio,
    enviarNotificacionMinisterio,
    enviarAnuncioMinisterio
} = require('../controllers/ministerioController');
const { esAdminIglesia, esMiembroIglesia, esLiderOAdmin } = require('../middleware/ministerioMiddleware');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/ministerios/usuario/:userId
 * @desc    Obtener ministerios de un usuario específico
 * @access  Miembros de la misma iglesia
 */
router.get('/usuario/:userId', esMiembroIglesia, obtenerMinisteriosUsuario);

/**
 * @route   POST /api/ministerios/asignar
 * @desc    Asignar ministerio a un usuario (con cargo)
 * @access  Pastor principal o adminIglesia
 * @body    { usuarioId, ministerio, cargo, iglesiaId }
 */
router.post('/asignar', asignarMinisterio);

/**
 * @route   PATCH /api/ministerios/:ministerioId
 * @desc    Actualizar cargo de un ministerio
 * @access  Pastor principal o adminIglesia
 * @body    { usuarioId, cargo }
 */
router.patch('/:ministerioId', actualizarMinisterio);

/**
 * @route   DELETE /api/ministerios/:ministerioId
 * @desc    Remover ministerio de un usuario
 * @access  Pastor principal o adminIglesia
 * @query   usuarioId
 */
router.delete('/:ministerioId', removerMinisterio);

/**
 * @route   POST /api/ministerios/:ministerioNombre/miembros
 * @desc    Agregar o remover miembro de un ministerio (para líderes)
 * @access  Líder del ministerio, pastor principal o adminIglesia
 * @body    { usuarioId, accion: 'agregar' | 'remover' }
 */
router.post('/:ministerioNombre/miembros', esLiderOAdmin, gestionarMiembroMinisterio);

/**
 * @route   GET /api/ministerios/:ministerioNombre/miembros
 * @desc    Obtener todos los miembros de un ministerio
 * @access  Miembros de la iglesia
 * @query   iglesiaId
 */
router.get('/:ministerioNombre/miembros', esMiembroIglesia, obtenerMiembrosPorMinisterio);

/**
 * @route   POST /api/ministerios/:ministerioNombre/notificaciones
 * @desc    Enviar notificación a todos los miembros de un ministerio
 * @access  Líder del ministerio, pastor principal o adminIglesia
 * @body    { iglesiaId, contenido, metadata }
 */
router.post('/:ministerioNombre/notificaciones', esLiderOAdmin, enviarNotificacionMinisterio);

/**
 * @route   POST /api/ministerios/:ministerioNombre/anuncios
 * @desc    Enviar anuncio a todos los miembros de un ministerio
 * @access  Líder del ministerio, pastor principal o adminIglesia
 * @body    { iglesiaId, titulo, mensaje, tipo }
 */
router.post('/:ministerioNombre/anuncios', esLiderOAdmin, enviarAnuncioMinisterio);

module.exports = router;
