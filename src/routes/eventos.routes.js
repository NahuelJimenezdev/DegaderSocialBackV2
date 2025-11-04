const { Router } = require('express');
const eventoController = require('../controllers/evento.controller');
const { verifyToken, optionalAuth } = require('../middlewares/auth');
const { validateEvento } = require('../middlewares/validators');

const router = Router();

// Rutas públicas (con autenticación opcional)
router.get('/', optionalAuth, eventoController.getAll);
router.get('/upcoming', optionalAuth, eventoController.getUpcoming);
router.get('/:id', optionalAuth, eventoController.getById);

// Rutas protegidas
router.post('/', verifyToken, validateEvento, eventoController.create);
router.post('/:id/register', verifyToken, eventoController.register);
router.post('/:id/unregister', verifyToken, eventoController.unregister);
router.put('/:id', verifyToken, eventoController.update);
router.delete('/:id', verifyToken, eventoController.delete);

module.exports = router;
