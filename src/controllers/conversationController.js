const Conversation = require('../models/Conversation');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener todas las conversaciones del usuario
 * GET /api/conversaciones
 */
const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participantes: req.userId,
      activa: true
    })
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

    // Paginación de mensajes
    const skip = (page - 1) * limit;
    const totalMensajes = conversation.mensajes.length;
    const mensajesPaginados = conversation.mensajes
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

    // Crear nueva conversación
    conversation = new Conversation({
      tipo: 'privada',
      participantes: [req.userId, userId],
      mensajes: [],
      mensajesNoLeidos: [
        { usuario: req.userId, cantidad: 0 },
        { usuario: userId, cantidad: 0 }
      ]
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
      mensaje.archivo = {
        url: `/uploads/messages/${req.file.filename}`,
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
      activa: true
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
 * Eliminar conversación (marcar como inactiva)
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

    // Marcar como inactiva en lugar de eliminar
    conversation.activa = false;
    await conversation.save();

    res.json(formatSuccessResponse('Conversación eliminada exitosamente'));
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar conversación', [error.message]));
  }
};

module.exports = {
  getAllConversations,
  getConversationById,
  getOrCreateConversation,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteConversation
};
