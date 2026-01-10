const Ticket = require('../models/Ticket');
const User = require('../models/User.model');

/**
 * Crear un nuevo ticket
 * POST /api/tickets
 */
const createTicket = async (req, res) => {
    try {
        const { tipo, asunto, descripcion, adjuntos } = req.body;

        // Validaciones
        if (!asunto || !descripcion) {
            return res.status(400).json({
                success: false,
                message: 'Asunto y descripción son requeridos'
            });
        }

        // Si es de tipo apelación, incluir info de suspensión
        let suspensionRelacionada = null;
        if (tipo === 'apelacion') {
            const user = await User.findById(req.userId);
            if (user?.seguridad?.estadoCuenta === 'suspendido') {
                suspensionRelacionada = {
                    fechaSuspension: user.seguridad.fechaSuspension,
                    fechaFinSuspension: user.seguridad.fechaFinSuspension,
                    motivoSuspension: user.seguridad.motivoSuspension
                };
            }
        }

        // Crear ticket
        const ticket = new Ticket({
            usuario: req.userId,
            tipo: tipo || 'consulta',
            asunto,
            descripcion,
            adjuntos: adjuntos || [],
            suspensionRelacionada,
            prioridad: tipo === 'apelacion' ? 'alta' : 'media'
        });

        await ticket.save();

        // Popular usuario
        await ticket.populate('usuario', 'nombreCompleto username avatar');

        return res.status(201).json({
            success: true,
            message: 'Ticket creado exitosamente',
            ticket
        });
    } catch (error) {
        console.error('Error al crear ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear ticket'
        });
    }
};

/**
 * Obtener tickets del usuario
 * GET /api/tickets
 */
const getUserTickets = async (req, res) => {
    try {
        const { estado, tipo } = req.query;

        const query = { usuario: req.userId };
        if (estado) query.estado = estado;
        if (tipo) query.tipo = tipo;

        const tickets = await Ticket.find(query)
            .populate('usuario', 'nombreCompleto username avatar')
            .populate('moderadorAsignado', 'nombreCompleto username')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            tickets,
            count: tickets.length
        });
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tickets'
        });
    }
};

/**
 * Obtener ticket por ID
 * GET /api/tickets/:id
 */
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;

        const ticket = await Ticket.findById(id)
            .populate('usuario', 'nombreCompleto username avatar')
            .populate('moderadorAsignado', 'nombreCompleto username')
            .populate('respuestas.autor.usuario', 'nombreCompleto username avatar rol');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        // Verificar ownership (solo el usuario o moderadores pueden ver)
        const isOwner = ticket.usuario._id.equals(req.userId);
        const isModerator = req.user?.rol === 'moderador' || req.user?.rol === 'admin';

        if (!isOwner && !isModerator) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver este ticket'
            });
        }

        return res.json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Error al obtener ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener ticket'
        });
    }
};

/**
 * Agregar respuesta a un ticket
 * POST /api/tickets/:id/responses
 */
const addResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenido, adjuntos } = req.body;

        if (!contenido) {
            return res.status(400).json({
                success: false,
                message: 'El contenido es requerido'
            });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        // Verificar permisos
        const isOwner = ticket.usuario.equals(req.userId);
        const isModerator = req.user?.rol === 'moderador' || req.user?.rol === 'admin';

        if (!isOwner && !isModerator) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para responder a este ticket'
            });
        }

        // Agregar respuesta
        await ticket.agregarRespuesta(
            {
                tipo: isModerator ? 'moderador' : 'usuario',
                usuario: req.userId
            },
            contenido,
            adjuntos || []
        );

        // Popular para respuesta
        await ticket.populate('respuestas.autor.usuario', 'nombreCompleto username avatar rol');

        return res.json({
            success: true,
            message: 'Respuesta agregada',
            ticket
        });
    } catch (error) {
        console.error('Error al agregar respuesta:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al agregar respuesta'
        });
    }
};

/**
 * Actualizar estado del ticket (solo moderadores)
 * PATCH /api/tickets/:id/status
 */
const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['abierto', 'en_revision', 'resuelto', 'rechazado', 'cerrado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        ticket.estado = estado;
        await ticket.save();

        return res.json({
            success: true,
            message: 'Estado actualizado',
            ticket
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar estado'
        });
    }
};

module.exports = {
    createTicket,
    getUserTickets,
    getTicketById,
    addResponse,
    updateTicketStatus
};
