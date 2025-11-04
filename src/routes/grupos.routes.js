const { Router } = require('express');
const grupoController = require('../controllers/grupo.controller');
const { verifyToken, optionalAuth } = require('../middlewares/auth');
const { validateGrupo } = require('../middlewares/validators');

const router = Router();

// Rutas públicas (con autenticación opcional)
router.get('/', optionalAuth, grupoController.getAll);
router.get('/:id', optionalAuth, grupoController.getById);

// Rutas protegidas
router.post('/', verifyToken, validateGrupo, grupoController.create);
router.post('/:id/join', verifyToken, grupoController.join);
router.post('/:id/leave', verifyToken, grupoController.leave);
router.post('/:id/accept', verifyToken, grupoController.acceptJoinRequest);
router.put('/:id/member/role', verifyToken, grupoController.updateMemberRole);
router.delete('/:id', verifyToken, grupoController.delete);

module.exports = router;
