const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const Friendship = require('../models/Friendship.model');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');
const { processAndUploadImage } = require('../services/imageOptimizationService');

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
      .populate('participantes', 'nombres apellidos social.fotoPerfil social.username ultimaConexion')
      .populate({
        path: 'ultimoMensaje',
        populate: { path: 'sender', select: 'nombres apellidos social.fotoPerfil' }
      })
      .sort({ updatedAt: -1 })
      .lean();

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
    const { cursorAt, cursorId, limit = 50 } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const conversation = await Conversation.findById(id)
      .populate('participantes', 'nombres apellidos social ultimaConexion');

    if (!conversation) {
      return res.status(404).json(formatErrorResponse('Conversación no encontrada'));
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participantes.some(p => p._id.equals(req.userId));
    if (!isParticipant) {
      return res.status(403).json(formatErrorResponse('No tienes acceso a esta conversación'));
    }

    // Construir query de mensajes con cursor compuesto
    let messageQuery = { conversationId: id };

    // Filtrar mensajes según si el usuario vació la conversación
    const userClear = conversation.clearedBy.find(c => c.usuario.equals(req.userId));
    if (userClear) {
      messageQuery.createdAt = { $gt: userClear.fecha };
    }

    // Aplicar cursor compuesto para paginación segura
    if (cursorAt && cursorId) {
      messageQuery.$and = messageQuery.$and || [];
      messageQuery.$and.push({
        $or: [
          { createdAt: { $lt: new Date(cursorAt) } },
          {
            createdAt: new Date(cursorAt),
            _id: { $lt: cursorId }
          }
        ]
      });
    }

    const messages = await Message.find(messageQuery)
      .populate('sender', 'nombres apellidos social')
      .populate({
         path: 'replyTo',
         populate: { path: 'sender', select: 'nombres' }
      })
      .sort({ createdAt: -1, _id: -1 }) // Primero obtenemos los más recientes hacia atrás
      .limit(parseInt(limit));

    // IMPORTANTE: Devolvemos en orden ASCENDENTE para que el frontend 
    // pueda renderizarlos de arriba (viejo) a abajo (nuevo) fácilmente.
    messages.reverse();

    const conversationData = conversation.toObject();
    
    res.json(formatSuccessResponse('Conversación obtenida', {
      conversation: conversationData,
      mensajes: messages,
      pagination: {
        hasMore: messages.length === parseInt(limit),
        nextCursor: messages.length > 0 ? {
          createdAt: messages[0].createdAt,
          _id: messages[0]._id
        } : null
      }
    }));
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

    console.log('🔍 getOrCreateConversation - userId:', userId, 'req.userId:', req.userId);

    if (!isValidObjectId(userId)) {
      return res.status(400).json(formatErrorResponse('ID de usuario inválido'));
    }

    if (userId === req.userId.toString()) {
      return res.status(400).json(formatErrorResponse('No puedes crear una conversación contigo mismo'));
    }

    // Buscar conversación existente
    console.log('🔍 Buscando conversación existente...');
    let conversation = await Conversation.findOne({
      tipo: 'privada',
      participantes: { $all: [req.userId, userId], $size: 2 }
    })
      .populate('participantes', 'nombres apellidos social ultimaConexion');

    if (conversation) {
      console.log('✅ Conversación encontrada:', conversation._id);

      return res.json(formatSuccessResponse('Conversación encontrada', conversation));
    }

    console.log('🔍 No existe conversación, verificando amistad...');
    // Verificar si son amigos
    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: userId, estado: 'aceptada' },
        { solicitante: userId, receptor: req.userId, estado: 'aceptada' }
      ]
    });

    const areFriends = !!friendship;
    console.log('👥 Son amigos?', areFriends);

    // Crear nueva conversación
    console.log('📝 Creando nueva conversación...');
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
    console.log('✅ Conversación guardada:', conversation._id);

    await conversation.populate('participantes', 'nombres apellidos social ultimaConexion');
    console.log('✅ Conversación populada');

    res.status(201).json(formatSuccessResponse('Conversación creada', conversation));
  } catch (error) {
    console.error('❌ Error al crear conversación:', error);
    console.error('❌ Stack:', error.stack);
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
    const { contenido, metadata, tipo = 'texto', clientMessageId, replyTo } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (!clientMessageId) {
      return res.status(400).json(formatErrorResponse('clientMessageId es requerido para asegurar idempotencia'));
    }

    // Validar que haya contenido o archivos
    if ((!contenido || contenido.trim().length === 0) && (!req.files || req.files.length === 0)) {
      return res.status(400).json(formatErrorResponse('El mensaje debe tener contenido o archivos adjuntos'));
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

    // Preparar objeto del mensaje
    const mensajeData = {
      conversationId: id,
      sender: req.userId,
      tipo,
      metadata,
      replyTo: isValidObjectId(replyTo) ? replyTo : null,
      estado: 'enviado'
    };

    if (contenido) {
      mensajeData.contenido = contenido.trim();
    }

    // PROCESAR ARCHIVOS (se mantiene lógica existente pero adaptada al nuevo modelo)
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const esImagen = file.mimetype.startsWith('image/');
      const esVideo = file.mimetype.startsWith('video/');
      const esAudio = file.mimetype.startsWith('audio/');

      mensajeData.tipo = esImagen ? 'imagen' : esVideo ? 'video' : esAudio ? 'audio' : 'archivo';

      if (esImagen) {
        const optimizedResult = await processAndUploadImage(file.buffer, file.originalname, 'messages');
        mensajeData.archivo = {
          url: optimizedResult.large || optimizedResult.medium || optimizedResult.small,
          small: optimizedResult.small,
          medium: optimizedResult.medium,
          large: optimizedResult.large,
          blurHash: optimizedResult.blurHash,
          nombre: file.originalname,
          tipo: file.mimetype,
          tamaño: file.size
        };
      } else {
        const fileUrl = await uploadToR2(file.buffer, file.originalname, 'messages');
        mensajeData.archivo = {
          url: fileUrl,
          nombre: file.originalname,
          tipo: file.mimetype,
          tamaño: file.size
        };
      }
    }

    // --- IDEMPOTENCIA ESTRICTA ---
    // Si ya existe un mensaje con este clientMessageId en esta conversación, lo devolvemos sin crear uno nuevo.
    const message = await Message.findOneAndUpdate(
      { conversationId: id, clientMessageId },
      { $setOnInsert: mensajeData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('sender', 'nombres apellidos social');

    // Actualizar ultimoMensaje y updatedAt en la conversación
    await Conversation.findByIdAndUpdate(id, {
      ultimoMensaje: message._id,
      updatedAt: new Date(),
      $pull: { deletedBy: req.userId } // Reactivar si estaba eliminada
    });

    // Actualizar contadores de no leídos para otros
    await Conversation.updateMany(
      { _id: id, 'mensajesNoLeidos.usuario': { $ne: req.userId } },
      { $inc: { 'mensajesNoLeidos.$.cantidad': 1 } }
    );

    // Emitir mensaje en tiempo real
    if (global.emitMessage) {
      global.emitMessage(id, {
        ...message.toObject(),
        clientMessageId // Asegurar que el front reciba el ID que generó
      }, conversation.participantes);
    }

    res.status(201).json(formatSuccessResponse('Mensaje procesado', message));
  } catch (error) {
    console.error('❌ [SEND MESSAGE] Error:', error);
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

    // Actualizar contadores en la conversación
    await Conversation.updateOne(
      { _id: id, 'mensajesNoLeidos.usuario': req.userId },
      { $set: { 'mensajesNoLeidos.$.cantidad': 0 } }
    );

    // Marcar mensajes como leídos en la colección independiente
    await Message.updateMany(
      { conversationId: id, sender: { $ne: req.userId }, estado: { $ne: 'leido' } },
      { $set: { estado: 'leido', fechaLeido: new Date() } }
    );

    // Emitir evento Socket.IO
    if (global.io) {
      global.io.to(`user:${req.userId}`).emit('conversationRead', {
        conversationId: id,
        userId: req.userId
      });
      
      // Notificar a otros que sus mensajes fueron leídos
      const conversation = await Conversation.findById(id).select('participantes');
      conversation.participantes.forEach(p => {
        if (!p.equals(req.userId)) {
          global.io.to(`user:${p}`).emit('messages_read_update', {
            conversationId: id,
            readerId: req.userId,
            readAt: new Date()
          });
        }
      });
    }

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
    }).select('mensajesNoLeidos').lean();

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
    }

    // 🆕 TAMBIÉN vaciar la conversación (limpia el historial)
    // Así, si la conversación "revive" por un nuevo mensaje, aparecerá vacía.
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
