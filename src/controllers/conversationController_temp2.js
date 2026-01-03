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

    // Emitir evento Socket.IO para actualizar contador en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.userId}`).emit('conversationRead', {
        conversationId: id,
        userId: req.userId
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
