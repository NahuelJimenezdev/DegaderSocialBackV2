const Conversation = require('../models/Conversation');
const Friendship = require('../models/Friendship');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');

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
      .populate('participantes', 'nombres apellidos social ultimaConexion')
      .populate('ultimoMensaje.emisor', 'nombres apellidos social')
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
      .populate('participantes', 'nombres apellidos social ultimaConexion')
      .populate('mensajes.emisor', 'nombres apellidos social');

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
      .populate('participantes', 'nombres apellidos social ultimaConexion')
      .populate('mensajes.emisor', 'nombres apellidos social');

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
    const { contenido, tipo = 'texto' } = req.body;

    console.log('💬 [SEND MESSAGE] Conversación:', id);
    console.log('💬 [SEND MESSAGE] Archivos:', req.files ? req.files.length : 0);

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
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

    const mensaje = {
      emisor: req.userId,
      contenido: contenido ? contenido.trim() : '',
      tipo,
      leido: false
    };

    // 🆕 PROCESAR ARCHIVOS SUBIDOS A R2 (múltiples archivos)
    if (req.files && req.files.length > 0) {
      console.log('📤 [SEND MESSAGE] Subiendo', req.files.length, 'archivos a R2...');

      const file = req.files[0]; // Por ahora, tomar el primer archivo

      try {
        const fileUrl = await uploadToR2(file.buffer, file.originalname, 'messages');
        console.log('✅ [SEND MESSAGE] Archivo subido a R2:', fileUrl);

        // Detectar tipo de archivo automáticamente
        const esImagen = file.mimetype.startsWith('image/');
        const esVideo = file.mimetype.startsWith('video/');
        const esAudio = file.mimetype.startsWith('audio/');

        mensaje.tipo = esImagen ? 'imagen' : esVideo ? 'video' : esAudio ? 'audio' : 'archivo';
        mensaje.archivo = {
          url: fileUrl,
          nombre: file.originalname,
          tipo: file.mimetype,
          tamaño: file.size
        };
      } catch (uploadError) {
        console.error('❌ [SEND MESSAGE] Error al subir archivo a R2:', uploadError);
        return res.status(500).json(formatErrorResponse('Error al subir archivo', [uploadError.message]));
      }
    }
    // Mantener compatibilidad con sistema legacy (single file)
    else if (req.file) {
      console.log('📎 [SEND MESSAGE] Archivo legacy detectado');

      try {
        const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, 'messages');
        console.log('✅ [SEND MESSAGE] Archivo legacy subido a R2:', fileUrl);

        const esImagen = req.file.mimetype.startsWith('image/');
        const esVideo = req.file.mimetype.startsWith('video/');
        const esAudio = req.file.mimetype.startsWith('audio/');

        mensaje.tipo = esImagen ? 'imagen' : esVideo ? 'video' : esAudio ? 'audio' : 'archivo';
        mensaje.archivo = {
          url: fileUrl,
          nombre: req.file.originalname,
          tipo: req.file.mimetype,
          tamaño: req.file.size
        };
      } catch (uploadError) {
        console.error('❌ [SEND MESSAGE] Error al subir archivo legacy a R2:', uploadError);
        return res.status(500).json(formatErrorResponse('Error al subir archivo', [uploadError.message]));
      }
    }

    console.log('💾 [SEND MESSAGE] Guardando mensaje...');
    await conversation.agregarMensaje(mensaje);

    await conversation.populate([
      { path: 'participantes', select: 'nombres apellidos social' },
      { path: 'mensajes.emisor', select: 'nombres apellidos social' }
    ]);

    const newMessage = conversation.mensajes[conversation.mensajes.length - 1];
    console.log('✅ [SEND MESSAGE] Mensaje guardado con ID:', newMessage._id);

