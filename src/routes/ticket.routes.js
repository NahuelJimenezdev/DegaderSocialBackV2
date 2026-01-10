const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const ticketController = require('../controllers/ticketController');
const { checkModerator } = require('../middleware/checkModerator.middleware');

// Rutas para usuarios (incluye suspendidos para tickets de apelación)
router.post('/', authenticate, ticketController.createTicket);
router.get('/', authenticate, ticketController.getUserTickets);
router.get('/:id', authenticate, ticketController.getTicketById);
router.post('/:id/responses', authenticate, ticketController.addResponse);

// Rutas solo para moderadores
router.patch('/:id/status', authenticate, checkModerator, ticketController.updateTicketStatus);

module.exports = router;
