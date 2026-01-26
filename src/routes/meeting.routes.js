const express = require('express');
const {
  createMeeting,
  getMyMeetings,
  joinMeeting,
  cancelMeeting,
  getMeetingsByIglesia,
} = require('../controllers/meetingController.js');

const { authenticate } = require('../middleware/auth.middleware.js');

const router = express.Router();

// Todas las rutas protegidas
router.use(authenticate);

router.route('/')
  .post(createMeeting);

router.route('/me')
  .get(getMyMeetings);

router.route('/:id/join')
  .put(joinMeeting);

router.route('/:id/cancel')
  .put(cancelMeeting);

router.route('/iglesia/:iglesiaId')
  .get(getMeetingsByIglesia);


module.exports = router;
