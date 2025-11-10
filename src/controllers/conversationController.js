const Conversation = require('../models/Conversation');
const Friendship = require('../models/Friendship');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener todas las conversaciones del usuario
 * GET /api/conversaciones?type=principal|pending|archived
 */
const getAllConversations = async (req, res) => {
  try {
    const { type = 'principal' } = req.query;

    let query = {
      participantes: req.userId,
      activa: true,
      deletedBy: { $ne: req.userId }
    };

    // Filtrar según el tipo de conversación
    if (type === 'pending') {
      // Conversaciones pendientes: messageRequestStatus = 'pending' y el usuario NO es quien inició
      query.messageRequestStatus = 'pending';
      query.initiatedBy = { $ne: req.userId };
      query.archivedBy = { $ne: req.userId }; // No mostrar archivadas en pendientes
    } else if (type === 'archived') {
      // Conversaciones archivadas por el usuario (buscar en el array)
      query.archivedBy = { $in: [req.userId] };
    } else {
      // Principal: conversaciones aceptadas o sin solicitud, y no archivadas
      query.archivedBy = { $ne: req.userId };
      query.$or = [
        { messageRequestStatus: 'accepted' },
        { messageRequestStatus: 'none' }
      ];
    }

    const conversations = await Conversation.find(query)
      .populate('participantes', 'nombre apellido avatar ultimaConexion')
      .populate('ultimoMensaje.emisor', 'nombre apellido avatar')
      .sort({ 'ultimoMensaje.fecha': -1 });

    res.json(formatSuccessResponse('Conversaciones obtenidas', conversations));
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json(formatErrorResponse('Error al obtener conversaciones', [error.message]));
  }
};

/**
 * Obtener conversación por ID
 * GET /api/conversaciones/:id
 */
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id)
      .populate('participantes', 'nombre apellido avatar ultimaConexion')
      .populate('mensajes.emisor', 'nombre apellido avatar');

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p._id.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Filtrar mensajes según si el usuario vació la conversación
    let mensajesFiltrados = conversation.mensajes;
    const userClear = conversation.clearedBy.find(c => c.usuario.equals(req.userId));

    if (userClear) {
      // Solo mostrar mensajes creados después de la fecha de vaciado
      mensajesFiltrados = conversation.mensajes.filter(m =>
        new Date(m.createdAt) > new Date(userClear.fecha)
      );
    }

    // Paginación de mensajes
    const skip = (page - 1) * limit;
    const totalMensajes = mensajesFiltrados.length;
    const mensajesPaginados = mensajesFiltrados
      .slice()
      .reverse()
      .slice(skip, skip + parseInt(limit))
      .reverse();

    const conversationData = conversation.toObject();
    conversationData.mensajes = mensajesPaginados;
    conversationData.pagination = {
      total: totalMensajes,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(totalMensajes / limit)
    };

    res.json(formatSuccessResponse('Conversación obtenida', conversationData));
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    res.status(500).json(formatErrorResponse('Error al obtener conversación', [error.message]));
  }
};

/**
 * Crear o obtener conversación con un usuario
 * POST /api/conversaciones/with/:userId
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json(formatErrorResponse('ID de usuario inválido'));
    }

    if (userId === req.userId.toString()) {
      return res.status(400).json(formatErrorResponse('No puedes crear una conversación contigo mismo'));
    }

    // Buscar conversación existente
    let conversation = await Conversation.findOne({
      tipo: 'privada',
      participantes: { $all: [req.userId, userId], $size: 2 }
    })
      .populate('participantes', 'nombre apellido avatar ultimaConexion')
      .populate('mensajes.emisor', 'nombre apellido avatar');

    if (conversation) {
      return res.json(formatSuccessResponse('Conversación encontrada', conversation));
    }

    // Verificar si son amigos
    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: userId, estado: 'aceptada' },
        { solicitante: userId, receptor: req.userId, estado: 'aceptada' }
      ]
    });

    const areFriends = !!friendship;

    // Crear nueva conversación
    conversation = new Conversation({
      tipo: 'privada',
      participantes: [req.userId, userId],
      mensajes: [],
      mensajesNoLeidos: [
        { usuario: req.userId, cantidad: 0 },
        { usuario: userId, cantidad: 0 }
      ],
      // Si no son amigos, la conversación está en estado pending
      messageRequestStatus: areFriends ? 'none' : 'pending',
      initiatedBy: req.userId
    });

    await conversation.save();

    await conversation.populate('participantes', 'nombre apellido avatar ultimaConexion');

    res.status(201).json(formatSuccessResponse('Conversación creada', conversation));
  } catch (error) {
    console.error('Error al crear conversación:', error);
    res.status(500).json(formatErrorResponse('Error al crear conversación', [error.message]));
  }
};

/**
 * Enviar mensaje
 * POST /api/conversaciones/:id/message
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, tipo = 'texto' } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json(formatErrorResponse('El contenido del mensaje es obligatorio'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    const mensaje = {
      emisor: req.userId,
      contenido: contenido.trim(),
      tipo,
      leido: false
    };

    // Agregar archivo si se subió
    if (req.file) {
      // Detectar tipo de archivo automáticamente
      const esImagen = req.file.mimetype.startsWith('image/');
      const esVideo = req.file.mimetype.startsWith('video/');

      mensaje.tipo = esImagen ? 'imagen' : esVideo ? 'video' : 'archivo';
      mensaje.archivo = {
        url: `uploads/messages/${req.file.filename}`,
        nombre: req.file.originalname,
        tipo: req.file.mimetype,
        tamaño: req.file.size
      };
    }

    await conversation.agregarMensaje(mensaje);

    await conversation.populate([
      { path: 'participantes', select: 'nombre apellido avatar' },
      { path: 'mensajes.emisor', select: 'nombre apellido avatar' }
    ]);

    const newMessage = conversation.mensajes[conversation.mensajes.length - 1];

    // Emitir mensaje en tiempo real a través de Socket.IO
    if (global.emitMessage) {
      global.emitMessage(id, {
        _id: newMessage._id,
        conversationId: id,
        emisor: newMessage.emisor,
        contenido: newMessage.contenido,
        tipo: newMessage.tipo,
        archivo: newMessage.archivo,
        leido: newMessage.leido,
        createdAt: newMessage.createdAt
      });
    }

    res.status(201).json(formatSuccessResponse('Mensaje enviado', newMessage));
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al enviar mensaje', [error.message]));
  }
};

/**
 * Marcar conversación como leída
 * PUT /api/conversaciones/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    await conversation.marcarComoLeido(req.userId);

    res.json(formatSuccessResponse('Conversación marcada como leída'));
  } catch (error) {
    console.error('Error al marcar como leída:', error);
    res.status(500).json(formatErrorResponse('Error al marcar como leída', [error.message]));
  }
};

/**
 * Obtener conteo de mensajes no leídos
 * GET /api/conversaciones/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participantes: req.userId,
      activa: true,
      deletedBy: { $ne: req.userId }
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      const userUnread = conv.mensajesNoLeidos.find(m => m.usuario.equals(req.userId));
      if (userUnread) {
        totalUnread += userUnread.cantidad;
      }
    });

    res.json({
      success: true,
      data: { count: totalUnread }
    });
  } catch (error) {
    console.error('Error al contar mensajes no leídos:', error);
    res.status(500).json(formatErrorResponse('Error al contar mensajes no leídos', [error.message]));
  }
};

/**
 * Obtener conteo de solicitudes pendientes
 * GET /api/conversaciones/pending-count
 */
const getPendingCount = async (req, res) => {
  try {
    const pendingCount = await Conversation.countDocuments({
      participantes: req.userId,
      activa: true,
      deletedBy: { $ne: req.userId },
      messageRequestStatus: 'pending',
      initiatedBy: { $ne: req.userId }
    });

    res.json({
      success: true,
      data: { count: pendingCount }
    });
  } catch (error) {
    console.error('Error al contar solicitudes pendientes:', error);
    res.status(500).json(formatErrorResponse('Error al contar solicitudes pendientes', [error.message]));
  }
};

/**
 * Eliminar conversación (solo para el usuario que la elimina)
 * DELETE /api/conversaciones/:id
 */
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Agregar usuario a deletedBy (eliminación solo para este usuario)
    if (!conversation.deletedBy.some(userId => userId.equals(req.userId))) {
      conversation.deletedBy.push(req.userId);
      await conversation.save();
    }

    res.json(formatSuccessResponse('Conversación eliminada exitosamente'));
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar conversación', [error.message]));
  }
};

/**
 * Archivar/Desarchivar conversación
 * PUT /api/conversaciones/:id/archive
 */
const archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Toggle: si ya está archivado, desarchivarlo; si no, archivarlo
    const isArchived = conversation.archivedBy.some(userId => userId.equals(req.userId));

    if (isArchived) {
      conversation.archivedBy = conversation.archivedBy.filter(userId => !userId.equals(req.userId));
      await conversation.save();
      res.json(formatSuccessResponse('Conversación desarchivada exitosamente'));
    } else {
      conversation.archivedBy.push(req.userId);
      await conversation.save();
      res.json(formatSuccessResponse('Conversación archivada exitosamente'));
    }
  } catch (error) {
    console.error('Error al archivar conversación:', error);
    res.status(500).json(formatErrorResponse('Error al archivar conversación', [error.message]));
  }
};

/**
 * Vaciar conversación (eliminar mensajes solo para el usuario)
 * PUT /api/conversaciones/:id/clear
 */
const clearConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Registrar que el usuario vació la conversación en esta fecha
    const existingClear = conversation.clearedBy.find(c => c.usuario.equals(req.userId));

    if (existingClear) {
      existingClear.fecha = new Date();
    } else {
      conversation.clearedBy.push({
        usuario: req.userId,
        fecha: new Date()
      });
    }

    await conversation.save();

    res.json(formatSuccessResponse('Conversación vaciada exitosamente'));
  } catch (error) {
    console.error('Error al vaciar conversación:', error);
    res.status(500).json(formatErrorResponse('Error al vaciar conversación', [error.message]));
  }
};

/**
 * Aceptar solicitud de mensaje
 * PUT /api/conversaciones/:id/accept-request
 */
const acceptMessageRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Verificar que el usuario NO es quien inició la conversación
    if (conversation.initiatedBy && conversation.initiatedBy.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No puedes aceptar tu propia solicitud'));
    }

    // Aceptar la solicitud
    conversation.messageRequestStatus = 'accepted';
    await conversation.save();

    res.json(formatSuccessResponse('Solicitud de mensaje aceptada'));
  } catch (error) {
    console.error('Error al aceptar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al aceptar solicitud', [error.message]));
  }
};

/**
 * Rechazar solicitud de mensaje
 * PUT /api/conversaciones/:id/decline-request
 */
const declineMessageRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Verificar que el usuario NO es quien inició la conversación
    if (conversation.initiatedBy && conversation.initiatedBy.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No puedes rechazar tu propia solicitud'));
    }

    // Agregar al usuario actual a deletedBy para que no vea más esta conversación
    if (!conversation.deletedBy.some(userId => userId.equals(req.userId))) {
      conversation.deletedBy.push(req.userId);
      await conversation.save();
    }

    res.json(formatSuccessResponse('Solicitud de mensaje rechazada'));
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al rechazar solicitud', [error.message]));
  }
};

/**
 * Destacar/Quitar destacar conversación
 * PUT /api/conversaciones/:id/star
 */
const starConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Toggle: si ya está destacado, quitarlo; si no, agregarlo
    const isStarred = conversation.starredBy.some(userId => userId.equals(req.userId));

    if (isStarred) {
      conversation.starredBy = conversation.starredBy.filter(userId => !userId.equals(req.userId));
      await conversation.save();
      res.json(formatSuccessResponse('Conversación quitada de destacados'));
    } else {
      conversation.starredBy.push(req.userId);
      await conversation.save();
      res.json(formatSuccessResponse('Conversación destacada exitosamente'));
    }
  } catch (error) {
    console.error('Error al destacar conversación:', error);
    res.status(500).json(formatErrorResponse('Error al destacar conversación', [error.message]));
  }
};

module.exports = {
  getAllConversations,
  getConversationById,
  getOrCreateConversation,
  sendMessage,
  markAsRead,
  getUnreadCount,
  getPendingCount,
  deleteConversation,
  archiveConversation,
  clearConversation,
  acceptMessageRequest,
  declineMessageRequest,
  starConversation
};
