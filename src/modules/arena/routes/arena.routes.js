const express = require('express');
const router = express.Router();
const arenaController = require('../controllers/arena.controller');
const arenaGuard = require('../controllers/arenaGuard');
const { authenticate } = require('../../../middleware/auth.middleware');
const distributedRateLimit = require('../../../middlewares/distributedRateLimit.middleware');

// Todas las rutas de arena requieren autenticación
router.use(distributedRateLimit({ maxPerMinute: 60, type: 'api' }));
router.use(authenticate);

router.get('/challenges', arenaController.getChallenges);
router.get('/ranking', arenaController.getRanking);
router.get('/status', arenaController.getMyStatus);

// Límite de 10 partidas por minuto por usuario
router.post('/submit', distributedRateLimit({ maxPerMinute: 10, type: 'game' }), arenaGuard, arenaController.submitResult);

module.exports = router;
