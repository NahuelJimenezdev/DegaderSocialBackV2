const User = require('../models/User.model');
const Ticket = require('../models/Ticket');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');

/**
 * Obtener lista de usuarios suspendidos
 * GET /api/admin/suspended-users
 */
const getSuspendedUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'fechaSuspension' } = req.query;

        const query = {
            'seguridad.estadoCuenta': 'suspendido'
        };

        const users = await User.find(query)
            .select('nombres apellidos username social.fotoPerfil seguridad.fechaSuspension seguridad.suspensionFin seguridad.motivoSuspension createdAt')
            .lean({ virtuals: true })
            .sort({ [`seguridad.${sortBy}`]: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        return res.json({
            success: true,
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        console.error('Error al obtener usuarios suspendidos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios suspendidos'
        });
    }
};

/**
 * Levantar suspensión de un usuario
 * POST /api/admin/users/:userId/lift-suspension
 */
const liftSuspension = async (req, res) => {
    try {
        const { userId } = req.params;
        const { motivo } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.seguridad?.estadoCuenta !== 'suspendido') {
            return res.status(400).json({
                success: false,
                message: 'El usuario no está suspendido'
            });
        }

        // Guardar datos de la suspensión antes de limpiar
        const suspensionAnterior = {
            fechaSuspension: user.seguridad.fechaSuspension,
            suspensionFin: user.seguridad.suspensionFin,
            motivoSuspension: user.seguridad.motivoSuspension
        };

        // Levantar suspensión
        user.seguridad.estadoCuenta = 'activo';
        user.seguridad.fechaSuspension = null;
        user.seguridad.suspensionFin = null;
        user.seguridad.motivoSuspension = null;

        await user.save();

        // Registrar en audit log
        await AuditLog.registrar({
            moderadorId: req.userId,
            accion: 'levantar_suspension',
            objetivoTipo: 'usuario',
            objetivoId: userId,
            objetivoNombre: user.username,
            detalles: {
                motivoLevantamiento: motivo,
                suspensionAnterior,
                usuario: {
                    username: user.username,
                    nombreCompleto: user.nombreCompleto
                }
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            success: true,
            message: 'Suspensión levantada exitosamente',
            user: {
                _id: user._id,
                username: user.username,
                nombreCompleto: user.nombreCompleto,
                estadoCuenta: user.seguridad.estadoCuenta
            }
        });
    } catch (error) {
        console.error('Error al levantar suspensión:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al levantar suspensión'
        });
    }
};

/**
 * Obtener historial de reportes de un usuario
 * GET /api/admin/users/:userId/reports-history
 */
const getUserReportsHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Reportes DONDE el usuario fue reportado
        const reportedBy = await Report.find({
            'contentSnapshot.author': userId
        })
            .populate('reporter', 'username nombreCompleto avatar')
            .populate('moderator', 'username nombreCompleto')
            .sort({ createdAt: -1 })
            .limit(50);

        // Reportes QUE el usuario hizo
        const reportsMade = await Report.find({
            reporter: userId
        })
            .populate('moderator', 'username nombreCompleto')
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({
            success: true,
            reportedBy: reportedBy.length,
            reportsMade: reportsMade.length,
            reports: {
                asReported: reportedBy,
                asReporter: reportsMade
            }
        });
    } catch (error) {
        console.error('Error al obtener historial de reportes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener historial'
        });
    }
};

/**
 * Obtener todos los tickets (para moderadores)
 * GET /api/admin/tickets
 */
const getAllTickets = async (req, res) => {
    try {
        const { estado, tipo, page = 1, limit = 20 } = req.query;

        const query = {};
        if (estado && estado !== 'null' && estado !== 'undefined') query.estado = estado;
        if (tipo && tipo !== 'null' && tipo !== 'undefined') query.tipo = tipo;

        const tickets = await Ticket.find(query)
            .populate('usuario', 'nombreCompleto username avatar seguridad.estadoCuenta nombres apellidos')
            .populate('moderadorAsignado', 'nombreCompleto username nombres apellidos')
            .sort({ prioridad: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Ticket.countDocuments(query);

        console.log(`🔍 getAllTickets - Found ${tickets.length} tickets (Total: ${count})`); // DEBUG

        return res.json({
            success: true,
            tickets,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
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
 * Resolver o rechazar un ticket
 * POST /api/admin/tickets/:id/resolve
 */
const resolveTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { aprobado, motivo } = req.body;

        if (typeof aprobado !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Debe especificar si el ticket fue aprobado o no'
            });
        }

        const ticket = await Ticket.findById(id)
            .populate('usuario', 'nombreCompleto username');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        // Resolver ticket
        await ticket.resolver(aprobado, motivo, req.userId);

        // Si es apelación aprobada, levantar suspensión
        if (ticket.tipo === 'apelacion' && aprobado) {
            const user = await User.findById(ticket.usuario._id);
            if (user && user.seguridad?.estadoCuenta === 'suspendido') {
                user.seguridad.estadoCuenta = 'activo';
                user.seguridad.fechaSuspension = null;
                user.seguridad.suspensionFin = null;
                user.seguridad.motivoSuspension = null;
                await user.save();

                // Log de auditoría
                await AuditLog.registrar({
                    moderadorId: req.userId,
                    accion: 'levantar_suspension',
                    objetivoTipo: 'usuario',
                    objetivoId: user._id,
                    objetivoNombre: user.username,
                    detalles: {
                        motivoLevantamiento: `Apelación aprobada (Ticket #${ticket._id})`,
                        ticketId: ticket._id
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }
        }

        // Log de resolución de ticket
        await AuditLog.registrar({
            moderadorId: req.userId,
            accion: aprobado ? 'resolver_ticket' : 'rechazar_ticket',
            objetivoTipo: 'ticket',
            objetivoId: ticket._id,
            objetivoNombre: `Ticket de ${ticket.usuario.username}`,
            detalles: {
                tipo: ticket.tipo,
                asunto: ticket.asunto,
                motivo,
                aprobado
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            success: true,
            message: aprobado ? 'Ticket resuelto' : 'Ticket rechazado',
            ticket
        });
    } catch (error) {
        console.error('Error al resolver ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al resolver ticket'
        });
    }
};

/**
 * Obtener logs de auditoría
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
    try {
        const { moderadorId, accion, page = 1, limit = 50 } = req.query;

        const query = {};
        if (moderadorId) query.moderador = moderadorId;
        if (accion) query.accion = accion;

        const logs = await AuditLog.find(query)
            .populate('moderador', 'nombreCompleto username avatar nombres apellidos')
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await AuditLog.countDocuments(query);

        return res.json({
            success: true,
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        console.error('Error al obtener audit logs:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener logs'
        });
    }
};

module.exports = {
    getSuspendedUsers,
    liftSuspension,
    getUserReportsHistory,
    getAllTickets,
    resolveTicket,
    getAuditLogs
};
