const express = require('express');
const {
  createMeeting,
  getMyMeetings,
  requestAttendance,
  respondAttendance,
  getCreatorMeetingDetail,
  updateMeeting,
  joinMeeting,
  cancelMeeting,
  getMeetingsByIglesia,
} = require('../controllers/meetingController.js');

const { authenticate } = require('../middleware/auth.middleware.js');

const router = express.Router();

// Todas las rutas protegidas
router.use(authenticate);

// CRUD base
router.route('/')
  .post(createMeeting);

router.route('/me')
  .get(getMyMeetings);

// Detalle completo para el creador
router.route('/:id/detail')
  .get(getCreatorMeetingDetail);

// Editar reunión
router.route('/:id')
  .put(updateMeeting);

// Solicitud de asistencia (usuario pide "Asistiré")
router.route('/:id/request')
  .put(requestAttendance);

// Creador acepta o deniega (action: 'approve' | 'deny')
router.route('/:id/respond/:userId')
  .put(respondAttendance);

// Unirse (validación de acceso aprobado)
router.route('/:id/join')
  .put(joinMeeting);

// Cancelar
router.route('/:id/cancel')
  .put(cancelMeeting);

// Reuniones de iglesia
router.route('/iglesia/:iglesiaId')
  .get(getMeetingsByIglesia);

module.exports = router;
