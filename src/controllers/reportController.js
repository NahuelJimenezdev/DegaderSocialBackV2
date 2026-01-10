const { Report, REPORT_CONTENT_TYPES, REPORT_STATUSES, MODERATOR_ACTIONS, REPORT_REASONS } = require('../models/Report');
const User = require('../models/User.model');
const Post = require('../models/Post');

// ==========================================
// 🔹 FUNCIONES PARA USUARIOS
// ==========================================

/**
 * Crear un nuevo reporte
 * POST /api/reports
 */
const createReport = async (req, res) => {
    try {
        const { contentType, contentId, reason, subreason, comment } = req.body;
        const userId = req.userId;

        // Validar tipo de contenido
        if (!REPORT_CONTENT_TYPES.includes(contentType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de contenido inválido'
            });
        }

        // Obtener el contenido a reportar y crear snapshot
        let contentSnapshot;

        switch (contentType) {
            case 'post': {
                const post = await Post.findById(contentId)
                    .populate('usuario', 'username nombres apellidos social.fotoPerfil');

                if (!post) {
                    return res.status(404).json({
                        success: false,
                        message: 'Contenido no encontrado'
                    });
                }

                contentSnapshot = {
                    originalId: post._id,
                    type: 'post',
                    content: {
                        texto: post.texto,
                        imagenes: post.imagenes,
                        tipo: post.tipo,
                        createdAt: post.createdAt
                    },
                    author: {
                        userId: post.usuario._id,
                        username: post.usuario.username,
                        nombreCompleto: `${post.usuario.nombres.primero} ${post.usuario.apellidos.primero}`
                    },
                    createdAt: post.createdAt
                };
                break;
            }

            // TODO: Implementar snapshots para comentarios, perfiles y mensajes
            case 'comment':
            case 'profile':
            case 'message':
                return res.status(501).json({
                    success: false,
                    message: 'Tipo de reporte aún no implementado'
                });

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de contenido no soportado'
                });
        }

        // Verificar que el usuario no reporte su propio contenido
        if (contentSnapshot.author.userId.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'No puedes reportar tu propio contenido'
            });
        }

        // Verificar si ya existe un reporte del mismo usuario para el mismo contenido
        const existingReport = await Report.findOne({
            'reportedBy.userId': userId,
            'contentSnapshot.originalId': contentId,
            'contentSnapshot.type': contentType
        });

        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'Ya has reportado este contenido previamente',
                reportNumber: existingReport.reportNumber
            });
        }

        // Obtener información del usuario que reporta
        const reporter = await User.findById(userId);

        // Generar reportNumber único
        const reportCount = await Report.countDocuments();
        const reportNumber = `RPT-${Date.now()}-${String(reportCount + 1).padStart(6, '0')}`;

        // Crear el reporte
        const newReport = new Report({
            reportNumber, // Asignar explícitamente
            contentSnapshot,
            reportedBy: {
                userId: reporter._id,
                username: reporter.username,
                timestamp: new Date()
            },
            classification: {
                reason,
                subreason: subreason || undefined,
                comment: comment || undefined
            },
            metadata: {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
                platform: req.body.platform || 'web'
            }
        });

        await newReport.save();

        // Agregar acción al historial
        newReport.addActionToHistory(
            'reporte_creado',
            reporter,
            'Reporte creado por el usuario'
        );
        await newReport.save();

        console.log(`✅ Reporte creado: ${newReport.reportNumber} - Prioridad: ${newReport.priority}`);

        res.status(201).json({
            success: true,
            message: 'Reporte enviado correctamente. Será revisado por nuestro equipo de moderación.',
            data: {
                reportNumber: newReport.reportNumber,
                status: newReport.status,
                priority: newReport.priority
            }
        });

    } catch (error) {
        console.error('❌ Error al crear reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el reporte',
            error: error.message
        });
    }
};

/**
 * Obtener reportes creados por el usuario actual (opcional)
 * GET /api/reports/my-reports
 */
const getUserReports = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;

        const reports = await Report.find({ 'reportedBy.userId': userId })
            .select('reportNumber classification status priority createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Report.countDocuments({ 'reportedBy.userId': userId });

        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener reportes del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reportes',
            error: error.message
        });
    }
};

// ==========================================
// 🔹 FUNCIONES PARA MODERADORES (Trust & Safety)
// ==========================================

/**
 * Listar todos los reportes (con filtros)
 * GET /api/reports/moderator/list
 */
const getAllReports = async (req, res) => {
    try {
        const {
            status,
            priority,
            contentType,
            sortBy = 'priority', // priority, createdAt, status
            page = 1,
            limit = 20
        } = req.query;

        // Construir query
        const query = {};

        if (status && REPORT_STATUSES.includes(status)) {
            query.status = status;
        }

        if (priority && ['alta', 'media', 'baja'].includes(priority)) {
            query.priority = priority;
        }

        if (contentType && REPORT_CONTENT_TYPES.includes(contentType)) {
            query['contentSnapshot.type'] = contentType;
        }

        // Definir ordenamiento
        let sort = {};
        if (sortBy === 'priority') {
            // Alta -> Media -> Baja, luego por fecha
            sort = { priority: 1, createdAt: -1 };
        } else if (sortBy === 'createdAt') {
            sort = { createdAt: -1 };
        } else if (sortBy === 'status') {
            sort = { status: 1, createdAt: -1 };
        }

        // Ejecutar query
        const reports = await Report.find(query)
            .populate('moderation.assignedTo', 'username nombres apellidos')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Report.countDocuments(query);

        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('❌ Error al listar reportes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar reportes',
            error: error.message
        });
    }
};

/**
 * Obtener detalle completo de un reporte
 * GET /api/reports/moderator/:id
 */
const getReportById = async (req, res) => {
    try {
        const { id } = req.params;

        const report = await Report.findById(id)
            .populate('reportedBy.userId', 'username nombres apellidos social.fotoPerfil')
            .populate('contentSnapshot.author.userId', 'username nombres apellidos social.fotoPerfil seguridad.estadoCuenta')
            .populate('moderation.assignedTo', 'username nombres apellidos')
            .populate('moderation.reviewedBy', 'username nombres apellidos')
            .populate('actionHistory.performedBy', 'username nombres apellidos');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        // Obtener contexto adicional del usuario reportado (con logs para depuración)
        // console.log('🔍 [DEBUG] Procesando reporte:', id);
        // console.log('📄 [DEBUG] Snapshot author:', report.contentSnapshot?.author);

        const userDoc = report.contentSnapshot?.author?.userId;
        const reportedUserId = userDoc?._id || userDoc;

        // console.log('👤 [DEBUG] UserDoc ID:', reportedUserId);

        // Conteo de reportes previos del mismo usuario
        let previousReports = 0;
        let recentPosts = [];
        if (reportedUserId) {
            previousReports = await Report.countDocuments({
                'contentSnapshot.author.userId': reportedUserId,
                status: 'valido'
            });

            // Obtener publicaciones recientes del usuario (contexto)
            if (report.contentSnapshot.type === 'post') {
                recentPosts = await Post.find({
                    usuario: reportedUserId,
                    _id: { $ne: report.contentSnapshot.originalId }
                })
                    .select('texto imagenes createdAt')
                    .sort({ createdAt: -1 })
                    .limit(5);
            }
        } // Cierre del if (reportedUserId)

        res.json({
            success: true,
            data: {
                report,
                context: {
                    previousReportsCount: previousReports,
                    recentPosts
                }
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener reporte',
            error: error.message
        });
    }
};

/**
 * Asignar reporte al moderador actual
 * PUT /api/reports/moderator/:id/assign
 */
const assignReportToSelf = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        // Verificar que el reporte esté pendiente o no asignado
        if (report.moderation.assignedTo && report.moderation.assignedTo.toString() !== userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Este reporte ya está asignado a otro moderador'
            });
        }

        const moderator = await User.findById(userId);

        report.moderation.assignedTo = userId;
        report.moderation.assignedAt = new Date();
        report.status = 'en_revision';

        report.addActionToHistory(
            'asignacion',
            moderator,
            'Reporte asignado al moderador'
        );

        await report.save();

        res.json({
            success: true,
            message: 'Reporte asignado correctamente',
            data: report
        });

    } catch (error) {
        console.error('❌ Error al asignar reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al asignar reporte',
            error: error.message
        });
    }
};

/**
 * Actualizar estado del reporte
 * PUT /api/reports/moderator/:id/status
 */
const updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, justification } = req.body;
        const userId = req.userId;

        if (!REPORT_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        if (!justification || justification.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La justificación es obligatoria'
            });
        }

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        const moderator = await User.findById(userId);
        const previousStatus = report.status;

        report.status = status;
        report.addActionToHistory(
            'cambio_estado',
            moderator,
            justification,
            { previousStatus, newStatus: status }
        );

        await report.save();

        res.json({
            success: true,
            message: 'Estado actualizado correctamente',
            data: report
        });

    } catch (error) {
        console.error('❌ Error al actualizar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar estado',
            error: error.message
        });
    }
};

/**
 * Aplicar acción de moderación
 * POST /api/reports/moderator/:id/action
 */
const takeModeratorAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, justification, isValid } = req.body;
        const userId = req.userId;

        if (!MODERATOR_ACTIONS.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Acción inválida'
            });
        }

        if (!justification || justification.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La justificación es obligatoria para tomar acciones'
            });
        }

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        const moderator = await User.findById(userId);

        // Actualizar decisión de moderación
        report.moderation.reviewedBy = userId;
        report.moderation.reviewedAt = new Date();
        report.moderation.decision = {
            isValid: isValid === true,
            action,
            justification,
            appliedAt: new Date()
        };

        // Actualizar estado según la decisión
        if (isValid) {
            report.status = 'valido';
        } else {
            report.status = 'no_valido';
        }

        // Si se escaló al Founder
        if (action === 'escalar_founder') {
            report.status = 'escalado';
            report.flags.isEscalated = true;
        }

        // Agregar al historial
        report.addActionToHistory(
            action,
            moderator,
            justification,
            { isValid, action }
        );

        await report.save();

        // APICAR ACCIONES REALES
        // ======================
        if (isValid) {
            // CORRECCIÓN: Mapear las propiedades correctas del snapshot
            // El snapshot guarda 'type' (no contentType) y 'originalId' (no contentId)
            const { type: contentType, originalId: contentId, author } = report.contentSnapshot;

            console.log(`🔍 [DEBUG] Procesando acción ${action} para ${contentType} ID: ${contentId}`);

            // 1. Acciones sobre Contenido (Eliminar / Ocultar)
            if (action === 'eliminar_contenido') {
                if (contentType === 'post') {
                    const deletedPost = await Post.findByIdAndDelete(contentId);
                    if (deletedPost) {
                        console.log(`🗑️ Post ${contentId} eliminado por moderación`);

                        // Verificación doble
                        const checkExists = await Post.findById(contentId);
                        if (!checkExists) {
                            console.log('✅ [DB] Confirmado: El post ha sido eliminado físicamente');
                        } else {
                            console.error('❌ [DB] ERROR FATAL: El post sigue existiendo después de findByIdAndDelete');
                        }

                        // Emitir evento de socket para limpieza en real-time
                        const io = global.io || req.app.get('io');
                        if (io) {
                            io.emit('post_deleted', contentId);
                            console.log('📡 [SOCKET] Emitido evento post_deleted:', contentId);
                        } else {
                            console.error('❌ [SOCKET] No se pudo emitir post_deleted: instancia io no encontrada');
                        }

                        // Notificar al autor
                        try {
                            const notification = new Notification({
                                receptor: author.userId,
                                emisor: userId, // El moderador actúa como emisor
                                tipo: 'sistema',
                                contenido: `Tu publicación ha sido eliminada por incumplir las normas de la comunidad. Motivo: ${justification}`,
                                referencia: { tipo: 'Post', id: contentId }, // ID aunque no exista, como referencia histórica
                                metadata: { action: 'eliminar_contenido', reportId: report._id }
                            });
                            await notification.save();

                            // Poblar y emitir socket
                            await notification.populate('emisor', 'username nombres apellidos social.fotoPerfil');
                            if (global.emitNotification) {
                                global.emitNotification(author.userId, notification);
                            }
                        } catch (notifError) {
                            console.error('Error al notificar eliminación:', notifError);
                        }
                    } else {
                        console.warn(`⚠️ Intento de eliminar post ${contentId} fallido: No encontrado`);
                    }
                } else if (contentType === 'comment') {
                    const result = await Post.findOneAndUpdate(
                        { 'comentarios._id': contentId },
                        { $pull: { comentarios: { _id: contentId } } }
                    );
                    if (result) {
                        console.log(`🗑️ Comentario ${contentId} eliminado por moderación`);
                        // Notificar (pendiente: buscar usuario del comentario si no viene en author.userId de forma directa)
                        // Para simplificar, asumimos author.userId viene del snapshot correcto
                        try {
                            const notification = new Notification({
                                receptor: author.userId,
                                emisor: userId,
                                tipo: 'sistema',
                                contenido: `Tu comentario ha sido eliminado por incumplir las normas. Motivo: ${justification}`,
                                referencia: { tipo: 'Post', id: result._id },
                                metadata: { action: 'eliminar_comentario', reportId: report._id }
                            });
                            await notification.save();
                        } catch (notifError) { console.error(notifError); }
                    }
                }
            } else if (action === 'ocultar_contenido') {
                if (contentType === 'post') {
                    await Post.findByIdAndUpdate(contentId, { privacidad: 'privado' });
                    console.log(`👁️ Post ${contentId} ocultado (propiedad privada)`);
                    try {
                        const notification = new Notification({
                            receptor: author.userId,
                            emisor: userId,
                            tipo: 'sistema',
                            contenido: `Tu publicación ha sido ocultada por incumplir las normas. Motivo: ${justification}`,
                            referencia: { tipo: 'Post', id: contentId },
                            metadata: { action: 'ocultar_contenido', reportId: report._id }
                        });
                        await notification.save();
                    } catch (notifError) { console.error(notifError); }
                }
            }

            // 2. Acciones sobre Usuario (Suspensión)
            if (action.startsWith('suspension_') || action === 'advertir_usuario') {
                const userToSanction = await User.findById(author.userId);

                if (userToSanction) {
                    let suspensionEndDate = null;
                    const now = new Date();
                    let mensajeSancion = '';

                    switch (action) {
                        case 'advertir_usuario':
                            mensajeSancion = `Has recibido una advertencia por incumplir las normas. Motivo: ${justification}`;
                            break;
                        case 'suspension_1_dia':
                            suspensionEndDate = new Date(now.setDate(now.getDate() + 1));
                            mensajeSancion = `Tu cuenta ha sido suspendida por 1 día. Motivo: ${justification}`;
                            break;
                        case 'suspension_3_dias':
                            suspensionEndDate = new Date(now.setDate(now.getDate() + 3));
                            mensajeSancion = `Tu cuenta ha sido suspendida por 3 días. Motivo: ${justification}`;
                            break;
                        case 'suspension_7_dias':
                            suspensionEndDate = new Date(now.setDate(now.getDate() + 7));
                            mensajeSancion = `Tu cuenta ha sido suspendida por 7 días. Motivo: ${justification}`;
                            break;
                        case 'suspension_30_dias':
                            suspensionEndDate = new Date(now.setDate(now.getDate() + 30));
                            mensajeSancion = `Tu cuenta ha sido suspendida por 30 días. Motivo: ${justification}`;
                            break;
                        case 'suspension_permanente':
                            suspensionEndDate = new Date(9999, 11, 31); // Futuro lejano
                            mensajeSancion = `Tu cuenta ha sido suspendida permanentemente. Motivo: ${justification}`;
                            break;
                    }

                    if (suspensionEndDate) {
                        userToSanction.seguridad.estadoCuenta = 'suspendido';
                        userToSanction.seguridad.suspensionFin = suspensionEndDate;
                        userToSanction.seguridad.motivoSuspension = justification;
                        await userToSanction.save();
                        console.log(`🚫 Usuario ${author.username} suspendido hasta ${suspensionEndDate}`);
                    }

                    // Enviar notificación de sistema
                    try {
                        const notification = new Notification({
                            receptor: userToSanction._id,
                            emisor: userId,
                            tipo: 'sistema',
                            contenido: mensajeSancion,
                            metadata: { action, reportId: report._id }
                        });
                        await notification.save();

                        // Poblar y emitir socket
                        await notification.populate('emisor', 'username nombres apellidos social.fotoPerfil');
                        if (global.emitNotification) {
                            global.emitNotification(userToSanction._id, notification);
                        }
                    } catch (notifError) {
                        console.error('Error al notificar sanción:', notifError);
                    }
                }
            }
        }


        console.log(`✅ Acción de moderación aplicada: ${action} en reporte ${report.reportNumber}`);

        res.json({
            success: true,
            message: 'Acción aplicada correctamente',
            data: report
        });

    } catch (error) {
        console.error('❌ Error al aplicar acción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al aplicar acción',
            error: error.message
        });
    }
};

/**
 * Obtener estadísticas para moderadores
 * GET /api/reports/moderator/stats
 */
const getModeratorStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Reportes pendientes
        const pendingCount = await Report.countDocuments({ status: 'pendiente' });

        // Reportes en revisión
        const inReviewCount = await Report.countDocuments({ status: 'en_revision' });

        // Reportes asignados al moderador actual
        const myAssignedCount = await Report.countDocuments({
            'moderation.assignedTo': userId,
            status: { $in: ['pendiente', 'en_revision'] }
        });

        // Reportes resueltos hoy por el moderador actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const resolvedTodayCount = await Report.countDocuments({
            'moderation.reviewedBy': userId,
            'moderation.reviewedAt': { $gte: today }
        });

        // Reportes de alta prioridad pendientes
        const highPriorityCount = await Report.countDocuments({
            priority: 'alta',
            status: { $in: ['pendiente', 'en_revision'] }
        });

        res.json({
            success: true,
            data: {
                pending: pendingCount,
                inReview: inReviewCount,
                myAssigned: myAssignedCount,
                resolvedToday: resolvedTodayCount,
                highPriority: highPriorityCount
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// ==========================================
// 🔹 FUNCIONES PARA FOUNDER
// ==========================================

/**
 * Obtener estadísticas de auditoría para el Founder
 * GET /api/reports/founder/audit
 */
const getFounderAuditStats = async (req, res) => {
    try {
        // Total de reportes
        const totalReports = await Report.countDocuments();

        // Reportes por estado
        const reportsByStatus = await Report.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Reportes escalados
        const escalatedReports = await Report.find({ 'flags.isEscalated': true })
            .populate('moderation.assignedTo', 'username nombres apellidos')
            .populate('contentSnapshot.author.userId', 'username nombres apellidos')
            .sort({ createdAt: -1 })
            .limit(20);

        // Estadísticas por moderador
        const moderatorStats = await Report.aggregate([
            {
                $match: {
                    'moderation.reviewedBy': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$moderation.reviewedBy',
                    totalReviewed: { $sum: 1 },
                    validReports: {
                        $sum: { $cond: [{ $eq: ['$moderation.decision.isValid', true] }, 1, 0] }
                    },
                    invalidReports: {
                        $sum: { $cond: [{ $eq: ['$moderation.decision.isValid', false] }, 1, 0] }
                    }
                }
            }
        ]);

        // Poblar información de moderadores
        const populatedModeratorStats = await User.populate(moderatorStats, {
            path: '_id',
            select: 'username nombres apellidos'
        });

        res.json({
            success: true,
            data: {
                totalReports,
                reportsByStatus,
                escalatedReports,
                moderatorStats: populatedModeratorStats
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de auditoría',
            error: error.message
        });
    }
};

/**
 * Escalar o revertir un caso
 * PUT /api/reports/founder/:id/escalate
 */
const escalateOrRevertCase = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, justification, newDecision } = req.body;
        const userId = req.userId;

        if (!justification || justification.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La justificación es obligatoria'
            });
        }

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Reporte no encontrado'
            });
        }

        const founder = await User.findById(userId);

        if (action === 'escalate') {
            report.flags.isEscalated = true;
            report.status = 'escalado';
        } else if (action === 'revert') {
            // Revertir decisión del moderador
            if (newDecision) {
                report.moderation.decision = {
                    ...report.moderation.decision,
                    ...newDecision,
                    justification: justification
                };
                report.status = newDecision.isValid ? 'valido' : 'no_valido';
            }
            report.flags.isEscalated = false;
        }

        report.addActionToHistory(
            `founder_${action}`,
            founder,
            justification,
            { action, newDecision }
        );

        await report.save();

        console.log(`✅ Founder ${action} en reporte ${report.reportNumber}`);

        res.json({
            success: true,
            message: `Acción de Founder aplicada: ${action}`,
            data: report
        });

    } catch (error) {
        console.error('❌ Error al procesar acción de Founder:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar acción',
            error: error.message
        });
    }
};

module.exports = {
    // Usuarios
    createReport,
    getUserReports,

    // Moderadores (Trust & Safety)
    getAllReports,
    getReportById,
    assignReportToSelf,
    updateReportStatus,
    takeModeratorAction,
    getModeratorStats,

    // Founder
    getFounderAuditStats,
    escalateOrRevertCase
};
