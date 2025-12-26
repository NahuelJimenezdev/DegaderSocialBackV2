const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Notification = require('../models/Notification');
const { validateGroupData, formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');

/**
 * Obtener todos los grupos
 * GET /api/grupos
 */
const getAllGroups = async (req, res) => {
  try {
    const { tipo, categoria, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};

    // Mostrar:
    // - Grupos públicos (todos pueden verlos)
    // - Grupos privados (todos pueden verlos para solicitar unirse)
    // - Grupos secretos SOLO si el usuario es miembro (solo por invitación)
    filter.$or = [
      { tipo: 'publico' },
      { tipo: 'privado' },
      { tipo: 'secreto', 'miembros.usuario': req.userId }
    ];

    if (tipo) filter.tipo = tipo;
    if (categoria) filter.categoria = categoria;

    const groups = await Group.find(filter)
      .populate('creador', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('miembros.usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Group.countDocuments(filter);

    // Transformar grupos para compatibilidad con frontend
    const transformedGroups = groups.map(group => {
      const groupObj = group.toObject();
      groupObj.imagePerfilGroup = groupObj.imagen; // Alias para compatibilidad
      groupObj.members = groupObj.miembros.map(m => ({
        user: m.usuario,
        role: m.rol,
        joinedAt: m.fechaUnion
      }));
      return groupObj;
    });

    res.json({
      success: true,
      data: {
        groups: transformedGroups,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json(formatErrorResponse('Error al obtener grupos', [error.message]));
  }
};

/**
 * Obtener grupo por ID
 * GET /api/grupos/:id
 */
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id)
      .populate('creador', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('administradores', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('moderadores', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('miembros.usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('solicitudesPendientes.usuario', 'nombres.primero apellidos.primero social.fotoPerfil');

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar acceso si es privado o secreto
    if (group.tipo !== 'publico') {
      const isMember = group.miembros.some(m => m.usuario._id.equals(req.userId));
      if (!isMember && !group.creador._id.equals(req.userId)) {
        return res.status(403).json(formatErrorResponse('No tienes acceso a este grupo'));
      }
    }

    // Transformar datos para compatibilidad con frontend
    const groupObj = group.toObject();
    groupObj.imagePerfilGroup = groupObj.imagen; // Alias para compatibilidad
    groupObj.members = groupObj.miembros.map(m => {
      let role = m.rol;

      // Transformar roles del español al inglés para el frontend
      if (role === 'miembro') role = 'member';
      if (role === 'administrador') role = 'admin';

      // Si es el creador, su rol es 'owner' independientemente del rol en miembros
      if (m.usuario._id.equals(group.creador._id)) {
        role = 'owner';
      }

      return {
        user: m.usuario,
        role: role,
        joinedAt: m.fechaUnion,
        _id: m._id
      };
    });

    // Transformar solicitudes pendientes para el frontend
    groupObj.joinRequests = groupObj.solicitudesPendientes.map(s => ({
      _id: s.usuario._id,
      user: s.usuario,
      createdAt: s.fecha,
      status: 'pending'
    }));

    // Calcular nivel de actividad en tiempo real (mensajes en los últimos 7 días)
    const GroupMessage = require('../models/GroupMessage');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessages = await GroupMessage.countDocuments({
      grupo: id,
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo }
    });

    // Calcular porcentaje de actividad (basado en promedio de mensajes por miembro)
    const memberCount = groupObj.members.length || 1;
    const avgMessagesPerMember = recentMessages / memberCount;
    // Si hay más de 2 mensajes por miembro en 7 días, es alta actividad
    const activityLevel = Math.min(100, Math.round((avgMessagesPerMember / 2) * 100));

    // Inicializar contadores si no existen o están en 0
    let messageCount = groupObj.estadisticas?.totalMensajes;
    let fileCount = groupObj.estadisticas?.totalArchivos;

    // Solo recalcular si los contadores no existen o están en 0
    if (!messageCount || messageCount === 0 || !fileCount || fileCount === 0) {
      console.log(`🔄 Inicializando contadores para grupo ${id}...`);

      // Contar todos los mensajes del grupo
      const totalMessages = await GroupMessage.countDocuments({
        grupo: id
      });

      // Contar mensajes con archivos
      const totalFiles = await GroupMessage.countDocuments({
        grupo: id,
        'files.0': { $exists: true }
      });

      console.log(`📊 Contadores inicializados:`, {
        totalMessages,
        totalFiles,
        activityLevel
      });

      // Actualizar en el modelo
      await Group.findByIdAndUpdate(id, {
        'estadisticas.totalMensajes': totalMessages,
        'estadisticas.totalArchivos': totalFiles,
        'estadisticas.nivelActividad': activityLevel
      });

      messageCount = totalMessages;
      fileCount = totalFiles;
    } else {
      // Usar contadores existentes y solo actualizar actividad
      console.log(`✅ Contadores actuales:`, {
        messageCount,
        fileCount,
        activityLevel
      });

      await Group.findByIdAndUpdate(id, {
        'estadisticas.nivelActividad': activityLevel
      });
    }

    // Agregar estadísticas al objeto de respuesta
    groupObj.messageCount = messageCount;
    groupObj.fileCount = fileCount;
    groupObj.activityLevel = activityLevel;

    res.json(formatSuccessResponse('Grupo encontrado', groupObj));
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    res.status(500).json(formatErrorResponse('Error al obtener grupo', [error.message]));
  }
};

/**
 * Crear grupo
 * POST /api/grupos
 */
const createGroup = async (req, res) => {
  try {
    console.log('📥 createGroup - Payload recibido:', JSON.stringify(req.body));
    console.log('👤 createGroup - Usuario autenticado:', req.userId);
    console.log('📁 createGroup - Archivo subido:', req.file ? req.file.filename : 'ninguno');

    const { nombre, descripcion, tipo, categoria } = req.body;

    // Validar datos
    console.log('🔍 Validando datos del grupo:', { nombre, tipo });
    const validation = validateGroupData({ nombre, tipo });
    if (!validation.isValid) {
      console.log('❌ Validación fallida:', validation.errors);
      return res.status(400).json(formatErrorResponse('Datos inválidos', validation.errors));
    }

    const groupData = {
      nombre,
      descripcion,
      tipo: tipo || 'publico',
      categoria: categoria || 'General',
      creador: req.userId,
      administradores: [req.userId],
      miembros: [{
        usuario: req.userId,
        rol: 'administrador',
        fechaUnion: new Date()
      }]
    };

    console.log('📦 Datos del grupo preparados:', JSON.stringify(groupData));

    // Agregar imagen si se subió
    if (req.file) {
      const imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, 'groups');
      groupData.imagen = imageUrl;
      console.log('🖼️ Imagen agregada a R2:', groupData.imagen);
    }

    const group = new Group(groupData);
    console.log('💾 Guardando grupo en DB...');
    await group.save();
    console.log('✅ Grupo guardado exitosamente con ID:', group._id);

    await group.populate([
      { path: 'creador', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      { path: 'miembros.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
    ]);

    // Transformar grupo para compatibilidad con frontend
    const groupObj = group.toObject();
    groupObj.imagePerfilGroup = groupObj.imagen; // Alias para compatibilidad
    groupObj.members = groupObj.miembros.map(m => ({
      user: m.usuario,
      role: m.rol,
      joinedAt: m.fechaUnion
    }));

    res.status(201).json(formatSuccessResponse('Grupo creado exitosamente', groupObj));
  } catch (error) {
    console.error('❌ Error al crear grupo:', error);
    console.error('❌ Error completo:', error.stack);

    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      console.log('❌ Errores de validación Mongoose:', errors);
      return res.status(400).json(formatErrorResponse('Datos inválidos', errors));
    }

    res.status(500).json(formatErrorResponse('Error al crear grupo', [error.message]));
  }
};

/**
 * Actualizar grupo
 * PUT /api/grupos/:id
 */
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo, categoria, reglas, configuracion } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que sea administrador
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId)) ||
      group.creador.equals(req.userId);

    if (!isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para editar este grupo'));
    }

    // Actualizar campos
    if (nombre) group.nombre = nombre;
    if (descripcion !== undefined) group.descripcion = descripcion;
    if (tipo) group.tipo = tipo;
    if (categoria) group.categoria = categoria;
    if (reglas) group.reglas = reglas;
    if (configuracion) group.configuracion = { ...group.configuracion, ...configuracion };

    // Actualizar imagen si se subió
    if (req.file) {
      // Eliminar imagen anterior de R2 si existe
      if (group.imagen && group.imagen.startsWith('https://')) {
        try {
          await deleteFromR2(group.imagen);
        } catch (error) {
          console.error('Error al eliminar imagen anterior de R2:', error);
        }
      }
      const imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, 'groups');
      group.imagen = imageUrl;
    }

    await group.save();

    await group.populate([
      { path: 'creador', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      { path: 'miembros.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
    ]);

    // Emitir evento de actualización de grupo
    if (global.io) {
      global.io.to(id).emit('groupUpdated', group);
      console.log(`📡 [SOCKET] Evento groupUpdated emitido para grupo ${id}`);
    }

    res.json(formatSuccessResponse('Grupo actualizado exitosamente', group));
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar grupo', [error.message]));
  }
};

/**
 * Unirse a grupo
 * POST /api/grupos/:id/join
 */
const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🚀 [JOIN] Solicitud de unión al grupo:', id);
    console.log('🚀 [JOIN] Usuario ID:', req.userId);

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    console.log('📊 [JOIN] Tipo de grupo:', group.tipo);
    console.log('📊 [JOIN] Configuración:', group.configuracion);

    // Verificar si ya es miembro
    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (isMember) {
      console.log('⚠️ [JOIN] Usuario ya es miembro');
      return res.status(400).json(formatErrorResponse('Ya eres miembro de este grupo'));
    }

    // Si es grupo privado, agregar a solicitudes pendientes
    if (group.tipo === 'privado') {
      console.log('🔒 [JOIN] Grupo privado - enviando solicitud');

      const hasPendingRequest = group.solicitudesPendientes.some(s => s.usuario.equals(req.userId));
      if (hasPendingRequest) {
        console.log('⚠️ [JOIN] Ya tiene solicitud pendiente');
        return res.status(400).json(formatErrorResponse('Ya tienes una solicitud pendiente'));
      }

      group.solicitudesPendientes.push({
        usuario: req.userId,
        fecha: new Date()
      });

      await group.save();
      console.log('✅ [JOIN] Solicitud guardada');

      // Notificar a administradores y creador
      const notificationTargets = [
        group.creador,
        ...group.administradores
      ];

      // Eliminar duplicados
      const uniqueTargets = [...new Set(notificationTargets.map(t => t.toString()))];

      console.log('📧 [JOIN] Enviando notificaciones a:', uniqueTargets.length, 'usuarios');

      // Crear y guardar notificaciones
      const adminNotifications = uniqueTargets.map(targetId => {
        return new Notification({
          receptor: targetId,
          emisor: req.userId,
          tipo: 'solicitud_grupo',
          contenido: 'solicitó unirse al grupo',
          referencia: {
            tipo: 'Group',
            id: group._id
          }
        }).save();
      });

      const savedNotifications = await Promise.all(adminNotifications);

      // IMPORTANTE: Popula emisor y grupo ANTES de emitir por Socket.IO
      for (const notification of savedNotifications) {
        await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil username');
        await notification.populate('referencia.id', 'nombre imagen');

        // Emitir notificación por Socket.IO con datos completos
        if (global.emitNotification) {
          global.emitNotification(notification.receptor.toString(), notification);
        }
      }

      console.log('✅ [JOIN] Solicitud enviada exitosamente');
      return res.json(formatSuccessResponse('Solicitud enviada. Espera la aprobación de un administrador'));
    }

    // Si es grupo secreto, no se puede unir directamente
    if (group.tipo === 'secreto') {
      console.log('🚫 [JOIN] Grupo secreto - acceso denegado');
      return res.status(403).json(formatErrorResponse('No puedes unirte a este grupo. Debes ser invitado'));
    }

    // Unirse directamente si es público
    console.log('🌍 [JOIN] Grupo público - unión directa');

    group.miembros.push({
      usuario: req.userId,
      rol: 'miembro',
      fechaUnion: new Date()
    });

    await group.save();
    console.log('✅ [JOIN] Usuario agregado como miembro');

    // Notificar al creador
    try {
      const notification = new Notification({
        receptor: group.creador,
        emisor: req.userId,
        tipo: 'nuevo_miembro_grupo',
        contenido: 'se unió a tu grupo',
        referencia: {
          tipo: 'Group',
          id: group._id
        }
      });
      await notification.save();

      // Emitir notificación por Socket.IO
      if (global.emitNotification) {
        global.emitNotification(group.creador, notification);
      }

      console.log('✅ [JOIN] Notificación enviada al creador');
    } catch (notifError) {
      console.error('⚠️ [JOIN] Error al enviar notificación (continuando):', notifError.message);
    }

    await group.populate('miembros.usuario', 'nombre apellido avatar');

    console.log('✅ [JOIN] Proceso completado exitosamente');
    res.json(formatSuccessResponse('Te has unido al grupo exitosamente', group));
  } catch (error) {
    console.error('❌ [JOIN] Error al unirse al grupo:', error);
    console.error('❌ [JOIN] Stack:', error.stack);
    res.status(500).json(formatErrorResponse('Error al unirse al grupo', [error.message]));
  }
};

/**
 * Salir de grupo
 * POST /api/grupos/:id/leave
 */
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // No permitir que el creador salga
    if (group.creador.equals(req.userId)) {
      return res.status(400).json(formatErrorResponse('El creador no puede salir del grupo. Transfiere la propiedad primero o elimina el grupo'));
    }

    // Eliminar de miembros
    group.miembros = group.miembros.filter(m => !m.usuario.equals(req.userId));

    // Eliminar de administradores y moderadores si aplica
    group.administradores = group.administradores.filter(admin => !admin.equals(req.userId));
    group.moderadores = group.moderadores.filter(mod => !mod.equals(req.userId));

    await group.save();

    res.json(formatSuccessResponse('Has salido del grupo exitosamente'));
  } catch (error) {
    console.error('Error al salir del grupo:', error);
    res.status(500).json(formatErrorResponse('Error al salir del grupo', [error.message]));
  }
};

/**
 * Obtener miembros del grupo
 * GET /api/grupos/:id/members
 */
const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id)
      .populate('miembros.usuario', 'nombre apellido avatar email ultimaConexion');

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    res.json(formatSuccessResponse('Miembros obtenidos', group.miembros));
  } catch (error) {
    console.error('Error al obtener miembros:', error);
    res.status(500).json(formatErrorResponse('Error al obtener miembros', [error.message]));
  }
};

/**
 * Eliminar grupo
 * DELETE /api/grupos/:id
 */
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Solo el creador puede eliminar
    if (!group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('Solo el creador puede eliminar el grupo'));
    }

    await Group.findByIdAndDelete(id);

    res.json(formatSuccessResponse('Grupo eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar grupo', [error.message]));
  }
};

/**
 * Subir avatar del grupo
 * POST /api/grupos/:id/avatar
 */
const uploadGroupAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que sea administrador o creador
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId)) ||
      group.creador.equals(req.userId);

    if (!isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para editar este grupo'));
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json(formatErrorResponse('No se proporcionó ninguna imagen'));
    }

    // Eliminar imagen anterior de R2 si existe
    if (group.imagen && group.imagen.startsWith('https://')) {
      try {
        await deleteFromR2(group.imagen);
      } catch (error) {
        console.error('Error al eliminar imagen anterior de R2:', error);
      }
    }

    // Subir nueva imagen a R2
    const imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, 'groups');
    group.imagen = imageUrl;
    await group.save();

    res.json(formatSuccessResponse('Avatar actualizado exitosamente', { imagen: group.imagen }));
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json(formatErrorResponse('Error al subir avatar', [error.message]));
  }
};

/**
 * Eliminar avatar del grupo
 * DELETE /api/grupos/:id/avatar
 */
const deleteGroupAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que sea administrador o creador
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId)) ||
      group.creador.equals(req.userId);

    if (!isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para editar este grupo'));
    }

    group.imagen = null;
    await group.save();

    res.json(formatSuccessResponse('Avatar eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar avatar:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar avatar', [error.message]));
  }
};

/**
 * Obtener mensajes de un grupo
 * GET /api/grupos/:id/messages
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Construir query
    const query = { grupo: id, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Obtener mensajes
    const messages = await GroupMessage.find(query)
      .populate('author', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate({
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'nombres.primero apellidos.primero social.fotoPerfil'
        }
      })
      .populate('reactions.usuario', 'nombres.primero apellidos.primero')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Transformar mensajes para agregar attachments desde files
    const transformedMessages = messages.reverse().map(msg => {
      const msgObj = msg.toObject();
      // Mapear files a attachments para compatibilidad con frontend
      if (msgObj.files && msgObj.files.length > 0) {
        msgObj.attachments = msgObj.files.map(f => ({
          type: f.tipo,
          url: f.url,
          name: f.nombre,
          size: f.tamaño
        }));
      }
      return msgObj;
    });

    res.json(formatSuccessResponse('Mensajes obtenidos', transformedMessages));
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json(formatErrorResponse('Error al obtener mensajes', [error.message]));
  }
};

/**
 * Enviar mensaje a un grupo
 * POST /api/grupos/:id/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, replyTo, tipo = 'texto', files = [] } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json(formatErrorResponse('El mensaje no puede estar vacío'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Crear mensaje
    const messageData = {
      grupo: id,
      author: req.userId,
      content: content.trim(),
      tipo,
      files
    };

    if (replyTo && isValidObjectId(replyTo)) {
      messageData.replyTo = replyTo;
    }

    const message = new GroupMessage(messageData);
    await message.save();

    // Incrementar contador de mensajes
    const updateFields = { $inc: { 'estadisticas.totalMensajes': 1 } };

    // Si tiene archivos, incrementar contador de archivos
    if (files && files.length > 0) {
      updateFields.$inc['estadisticas.totalArchivos'] = files.length;
    }

    await Group.findByIdAndUpdate(id, updateFields);

    // Poblar datos
    await message.populate([
      { path: 'author', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      {
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'nombres.primero apellidos.primero social.fotoPerfil'
        }
      }
    ]);

    // Emitir mensaje en tiempo real a todos los miembros del grupo
    if (global.emitGroupMessage) {
      global.emitGroupMessage(id, message);
    }

    res.status(201).json(formatSuccessResponse('Mensaje enviado', message));
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al enviar mensaje', [error.message]));
  }
};

/**
 * Eliminar mensaje
 * DELETE /api/grupos/:id/messages/:messageId
 */
const deleteMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(messageId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));
    }

    // Verificar que el mensaje pertenece al grupo
    if (!message.grupo.equals(id)) {
      return res.status(400).json(formatErrorResponse('El mensaje no pertenece a este grupo'));
    }

    // Verificar que el usuario es el autor o admin del grupo
    const group = await Group.findById(id);
    const isAuthor = message.author.equals(req.userId);
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId)) ||
      group.creador.equals(req.userId);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este mensaje'));
    }

    // Marcar como eliminado en lugar de borrar físicamente
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emitir evento Socket.IO para eliminar mensaje en tiempo real
    if (global.io) {
      const roomName = `group:${id}`;
      const socketsInRoom = await global.io.in(roomName).allSockets();
      console.log(`🗑️ Emitiendo messageDeleted al room ${roomName}, sockets: ${socketsInRoom.size}`);

      global.io.to(roomName).emit('messageDeleted', {
        groupId: id,
        messageId: messageId
      });
      console.log(`🗑️ Mensaje ${messageId} eliminado emitido al grupo ${id}`);
    }

    res.json(formatSuccessResponse('Mensaje eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar mensaje', [error.message]));
  }
};

/**
 * Reaccionar a un mensaje
 * POST /api/grupos/:id/messages/:messageId/reactions
 */
const reactToMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { emoji } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(messageId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (!emoji) {
      return res.status(400).json(formatErrorResponse('Emoji requerido'));
    }

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));
    }

    // Verificar que el mensaje pertenece al grupo
    if (!message.grupo.equals(id)) {
      return res.status(400).json(formatErrorResponse('El mensaje no pertenece a este grupo'));
    }

    // Verificar que el usuario es miembro
    const group = await Group.findById(id);
    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Verificar si el usuario ya reaccionó con este emoji
    const existingReaction = message.reactions.find(
      r => r.usuario.equals(req.userId) && r.emoji === emoji
    );

    let updatedMessage;
    if (existingReaction) {
      // Remover la reacción - usar operación atómica
      updatedMessage = await GroupMessage.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { usuario: req.userId, emoji: emoji } } },
        { new: true }
      ).populate('reactions.usuario', 'nombre apellido');
    } else {
      // Agregar nueva reacción - usar operación atómica
      updatedMessage = await GroupMessage.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { usuario: req.userId, emoji: emoji } } },
        { new: true }
      ).populate('reactions.usuario', 'nombre apellido');
    }

    // Emitir evento Socket.IO para actualizar reacciones en tiempo real
    if (global.io) {
      const roomName = `group:${id}`;
      const socketsInRoom = await global.io.in(roomName).allSockets();
      console.log(`😀 Emitiendo messageReactionUpdated al room ${roomName}, sockets: ${socketsInRoom.size}`);

      global.io.to(roomName).emit('messageReactionUpdated', {
        groupId: id,
        messageId: messageId,
        message: updatedMessage
      });
      console.log(`😀 Reacción en mensaje ${messageId} emitida al grupo ${id}`);
    }

    res.json(formatSuccessResponse('Reacción actualizada', updatedMessage));
  } catch (error) {
    console.error('Error al reaccionar:', error);
    res.status(500).json(formatErrorResponse('Error al reaccionar', [error.message]));
  }
};

/**
 * Destacar/quitar destacado de mensaje
 * PUT /api/grupos/:id/messages/:messageId/star
 */
const toggleStarMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(messageId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));
    }

    // Verificar que el mensaje pertenece al grupo
    if (!message.grupo.equals(id)) {
      return res.status(400).json(formatErrorResponse('El mensaje no pertenece a este grupo'));
    }

    // Verificar que el usuario es miembro
    const group = await Group.findById(id);
    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    await message.toggleStar(req.userId);

    // Poblar author para que el frontend tenga toda la información
    await message.populate([
      { path: 'author', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      {
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'nombres.primero apellidos.primero social.fotoPerfil'
        }
      }
    ]);

    // Transformar el mensaje para que el frontend reciba attachments
    const msgObj = message.toObject();
    if (msgObj.files && msgObj.files.length > 0) {
      msgObj.attachments = msgObj.files.map(f => ({
        type: f.tipo,
        url: f.url,
        name: f.nombre,
        size: f.tamaño
      }));
    }

    res.json(formatSuccessResponse('Estado de destacado actualizado', msgObj));
  } catch (error) {
    console.error('Error al destacar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al destacar mensaje', [error.message]));
  }
};

/**
 * Marcar mensaje como leído
 * PUT /api/grupos/:id/messages/:messageId/read
 */
const markMessageAsRead = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(messageId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));
    }

    // Verificar que el mensaje pertenece al grupo
    if (!message.grupo.equals(id)) {
      return res.status(400).json(formatErrorResponse('El mensaje no pertenece a este grupo'));
    }

    await message.markAsRead(req.userId);

    res.json(formatSuccessResponse('Mensaje marcado como leído'));
  } catch (error) {
    console.error('Error al marcar como leído:', error);
    res.status(500).json(formatErrorResponse('Error al marcar como leído', [error.message]));
  }
};

/**
 * Aprobar solicitud de unión a grupo
 * POST /api/grupos/:id/join/:requestId/approve
 */
const approveJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(requestId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que el usuario es creador o administrador
    const isCreator = group.creador.equals(req.userId);
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId));

    if (!isCreator && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para aprobar solicitudes'));
    }

    // Buscar la solicitud pendiente
    const requestIndex = group.solicitudesPendientes.findIndex(
      s => s.usuario.equals(requestId)
    );

    if (requestIndex === -1) {
      return res.status(404).json(formatErrorResponse('Solicitud no encontrada'));
    }

    // Verificar que el usuario no sea ya miembro
    const isMember = group.miembros.some(m => m.usuario.equals(requestId));
    if (isMember) {
      // Eliminar la solicitud duplicada
      group.solicitudesPendientes.splice(requestIndex, 1);
      await group.save();
      return res.status(400).json(formatErrorResponse('El usuario ya es miembro del grupo'));
    }

    // Agregar usuario a miembros
    group.miembros.push({
      usuario: requestId,
      rol: 'miembro',
      fechaUnion: new Date()
    });

    // Eliminar de solicitudes pendientes
    group.solicitudesPendientes.splice(requestIndex, 1);

    await group.save();

    // Notificar al usuario que su solicitud fue aprobada
    const notification = new Notification({
      receptor: requestId,
      emisor: req.userId,
      tipo: 'solicitud_grupo_aprobada',
      contenido: 'aceptó tu solicitud para unirte al grupo',
      referencia: {
        tipo: 'Group',
        id: group._id
      }
    });
    await notification.save();

    // Emitir notificación por Socket.IO si existe
    if (global.emitNotification) {
      global.emitNotification(requestId, notification);
    }

    await group.populate('miembros.usuario', 'nombre apellido avatar');

    res.json(formatSuccessResponse('Solicitud aprobada exitosamente', group));
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al aprobar solicitud', [error.message]));
  }
};

/**
 * Rechazar solicitud de unión a grupo
 * POST /api/grupos/:id/join/:requestId/reject
 */
const rejectJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(requestId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que el usuario es creador o administrador
    const isCreator = group.creador.equals(req.userId);
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId));

    if (!isCreator && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para rechazar solicitudes'));
    }

    // Buscar la solicitud pendiente
    const requestIndex = group.solicitudesPendientes.findIndex(
      s => s.usuario.equals(requestId)
    );

    if (requestIndex === -1) {
      return res.status(404).json(formatErrorResponse('Solicitud no encontrada'));
    }

    // Eliminar de solicitudes pendientes
    group.solicitudesPendientes.splice(requestIndex, 1);

    await group.save();

    // Notificar al usuario que su solicitud fue rechazada
    const notification = new Notification({
      receptor: requestId,
      emisor: req.userId,
      tipo: 'solicitud_grupo_rechazada',
      contenido: 'rechazó tu solicitud para unirte al grupo',
      referencia: {
        tipo: 'Group',
        id: group._id
      }
    });
    await notification.save();

    // Emitir notificación por Socket.IO si existe
    if (global.emitNotification) {
      global.emitNotification(requestId, notification);
    }

    res.json(formatSuccessResponse('Solicitud rechazada exitosamente'));
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al rechazar solicitud', [error.message]));
  }
};

/**
 * Obtener mensajes destacados por el usuario actual
 * GET /api/grupos/:id/destacados
 */
const getDestacados = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Obtener mensajes donde starredBy incluye al usuario actual
    const destacados = await GroupMessage.find({
      grupo: id,
      starredBy: req.userId
    })
      .populate('author', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate({
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'nombres.primero apellidos.primero social.fotoPerfil'
        }
      })
      .populate('reactions.usuario', 'nombres.primero apellidos.primero')
      .sort({ createdAt: -1 }); // Más recientes primero

    // Transformar mensajes para agregar attachments desde files
    const transformedDestacados = destacados.map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.files && msgObj.files.length > 0) {
        msgObj.attachments = msgObj.files.map(f => ({
          type: f.tipo,
          url: f.url,
          name: f.nombre,
          size: f.tamaño
        }));
      }
      return msgObj;
    });

    res.json(formatSuccessResponse('Mensajes destacados obtenidos', transformedDestacados));
  } catch (error) {
    console.error('Error al obtener destacados:', error);
    res.status(500).json(formatErrorResponse('Error al obtener destacados', [error.message]));
  }
};

/**
 * Obtener enlaces compartidos en el grupo
 * Extrae URLs tanto del contenido de mensajes como de attachments
 * GET /api/grupos/:id/enlaces
 */
const getEnlaces = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Obtener todos los mensajes del grupo
    const messages = await GroupMessage.find({ grupo: id })
      .populate('author', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    // Regex para detectar URLs (mejorada para capturar URLs más complejas)
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    const enlaces = [];

    messages.forEach(msg => {
      const msgEnlaces = [];

      // 1. Extraer URLs del contenido del mensaje
      if (msg.content) {
        const urls = msg.content.match(urlRegex);
        if (urls) {
          urls.forEach(url => {
            // Limpiar la URL (quitar puntuación al final)
            const cleanUrl = url.replace(/[.,;!?]+$/, '');
            msgEnlaces.push({
              url: cleanUrl,
              type: 'text',
              source: 'content',
              title: cleanUrl,
              messageId: msg._id,
              content: msg.content,
              author: msg.author,
              createdAt: msg.createdAt
            });
          });
        }
      }

      // 2. Extraer URLs de attachments tipo 'link'
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          if (att.type === 'link') {
            msgEnlaces.push({
              url: att.url,
              type: 'attachment',
              source: 'attachment',
              title: att.title || att.url,
              description: att.description,
              preview: att.preview,
              messageId: msg._id,
              content: msg.content,
              author: msg.author,
              createdAt: msg.createdAt
            });
          }
        });
      }

      // Agregar todos los enlaces de este mensaje
      enlaces.push(...msgEnlaces);
    });

    // Eliminar duplicados basados en URL
    const uniqueEnlaces = enlaces.filter((enlace, index, self) =>
      index === self.findIndex((e) => e.url === enlace.url)
    );

    res.json(formatSuccessResponse('Enlaces obtenidos', uniqueEnlaces));
  } catch (error) {
    console.error('Error al obtener enlaces:', error);
    res.status(500).json(formatErrorResponse('Error al obtener enlaces', [error.message]));
  }
};

/**
 * Actualizar rol de un miembro (admin/owner only)
 * POST /grupos/:id/members/:memberId/role
 */
const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body; // 'admin' o 'member' (en inglés desde frontend)

    console.log(`🔧 [UPDATE ROLE] Grupo: ${id}, Miembro: ${memberId}, Nuevo rol: ${role}`);

    // Validar que el rol sea válido
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json(formatErrorResponse('Rol no válido. Debe ser "admin" o "member"'));
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que el usuario sea admin o creador
    const isCreator = group.creador.equals(req.userId);
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId));

    if (!isCreator && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para cambiar roles'));
    }

    // Buscar el miembro en la lista
    const memberIndex = group.miembros.findIndex(m => m.usuario.equals(memberId));
    if (memberIndex === -1) {
      return res.status(404).json(formatErrorResponse('Miembro no encontrado en el grupo'));
    }

    // No se puede cambiar el rol del creador
    if (group.creador.equals(memberId)) {
      return res.status(400).json(formatErrorResponse('No se puede cambiar el rol del creador del grupo'));
    }

    // Actualizar rol (convertir de inglés a español para la BD)
    if (role === 'admin') {
      // Agregar a administradores si no está
      if (!group.administradores.some(admin => admin.equals(memberId))) {
        group.administradores.push(memberId);
      }
      // Usar 'administrador' en español para la BD
      group.miembros[memberIndex].rol = 'administrador';
    } else {
      // Quitar de administradores si está
      group.administradores = group.administradores.filter(admin => !admin.equals(memberId));
      // Usar 'miembro' en español para la BD
      group.miembros[memberIndex].rol = 'miembro';
    }

    await group.save();

    // 📧 Enviar notificación si se promovió a administrador
    if (role === 'admin') {
      try {
        const notification = new Notification({
          receptor: memberId,
          emisor: req.userId,
          tipo: 'promocion_admin_grupo',
          contenido: 'te nombró administrador del grupo',
          referencia: {
            tipo: 'Group',
            id: group._id
          }
        });

        await notification.save();

        // IMPORTANTE: Popula emisor y grupo ANTES de emitir por Socket.IO
        await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil username');
        await notification.populate('referencia.id', 'nombre imagen');

        // Emitir notificación en tiempo real
        if (global.emitNotification) {
          global.emitNotification(memberId.toString(), notification);
        }

        console.log(`📧 [UPDATE ROLE] Notificación de promoción enviada a ${memberId}`);
      } catch (notifError) {
        console.error('⚠️ [UPDATE ROLE] Error al enviar notificación (continuando):', notifError.message);
      }
    }

    console.log(`✅ [UPDATE ROLE] Rol actualizado exitosamente a '${group.miembros[memberIndex].rol}'`);
    res.json(formatSuccessResponse('Rol actualizado exitosamente', group));
  } catch (error) {
    console.error('❌ [UPDATE ROLE] Error:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar el rol', [error.message]));
  }
};

/**
 * Expulsar un miembro del grupo (admin/owner only)
 * DELETE /grupos/:id/members/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    console.log(`🚪 [REMOVE MEMBER] Grupo: ${id}, Miembro: ${memberId}`);

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Verificar que el usuario sea admin o creador
    const isCreator = group.creador.equals(req.userId);
    const isAdmin = group.administradores.some(admin => admin.equals(req.userId));

    if (!isCreator && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para expulsar miembros'));
    }

    // No se puede expulsar al creador
    if (group.creador.equals(memberId)) {
      return res.status(400).json(formatErrorResponse('No se puede expulsar al creador del grupo'));
    }

    // Buscar el miembro en la lista
    const memberIndex = group.miembros.findIndex(m => m.usuario.equals(memberId));
    if (memberIndex === -1) {
      return res.status(404).json(formatErrorResponse('Miembro no encontrado en el grupo'));
    }

    // Eliminar de miembros
    group.miembros.splice(memberIndex, 1);

    // Eliminar de administradores si está
    group.administradores = group.administradores.filter(admin => !admin.equals(memberId));

    await group.save();

    // Notificar al miembro expulsado (opcional)
    if (global.emitNotification) {
      global.emitNotification(memberId, {
        tipo: 'sistema',
        contenido: `Has sido expulsado del grupo ${group.nombre}`,
        grupo: group._id
      });
    }

    console.log(`✅ [REMOVE MEMBER] Miembro expulsado exitosamente`);
    res.json(formatSuccessResponse('Miembro expulsado exitosamente', group));
  } catch (error) {
    console.error('❌ [REMOVE MEMBER] Error:', error);
    res.status(500).json(formatErrorResponse('Error al expulsar miembro', [error.message]));
  }
};

/**
 * Transferir propiedad del grupo (owner only)
 * POST /grupos/:id/transfer
 */
const transferOwnership = async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;

    console.log(`👑 [TRANSFER] Grupo: ${id}, Nuevo propietario: ${newOwnerId}`);

    if (!newOwnerId) {
      return res.status(400).json(formatErrorResponse('Se requiere el ID del nuevo propietario'));
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    // Solo el creador puede transferir la propiedad
    if (!group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('Solo el propietario puede transferir la propiedad'));
    }

    // Verificar que el nuevo propietario sea miembro del grupo
    const newOwnerIsMember = group.miembros.some(m => m.usuario.equals(newOwnerId));
    if (!newOwnerIsMember) {
      return res.status(400).json(formatErrorResponse('El nuevo propietario debe ser miembro del grupo'));
    }

    // No transferir a uno mismo
    if (group.creador.equals(newOwnerId)) {
      return res.status(400).json(formatErrorResponse('Ya eres el propietario del grupo'));
    }

    // El antiguo creador se convierte en administrador
    if (!group.administradores.some(admin => admin.equals(req.userId))) {
      group.administradores.push(req.userId);
    }

    // Actualizar el rol del antiguo creador en miembros
    const oldOwnerMember = group.miembros.find(m => m.usuario.equals(req.userId));
    if (oldOwnerMember) {
      oldOwnerMember.rol = 'administrador';
    }

    // El nuevo creador deja de ser admin (si lo era) porque ahora es owner
    group.administradores = group.administradores.filter(admin => !admin.equals(newOwnerId));

    // Actualizar el rol del nuevo creador en miembros
    const newOwnerMember = group.miembros.find(m => m.usuario.equals(newOwnerId));
    if (newOwnerMember) {
      newOwnerMember.rol = 'propietario';
    }

    // Cambiar el creador
    group.creador = newOwnerId;

    await group.save();

    // Notificar al nuevo propietario
    if (global.emitNotification) {
      global.emitNotification(newOwnerId, {
        tipo: 'sistema',
        contenido: `Ahora eres el propietario del grupo ${group.nombre}`,
        grupo: group._id
      });
    }

    console.log(`✅ [TRANSFER] Propiedad transferida exitosamente`);
    res.json(formatSuccessResponse('Propiedad transferida exitosamente', group));
  } catch (error) {
    console.error('❌ [TRANSFER] Error:', error);
    res.status(500).json(formatErrorResponse('Error al transferir propiedad', [error.message]));
  }
};

/**
 * Obtener archivos (videos, audio, documentos) del grupo
 * GET /api/grupos/:id/archivos
 */
const getArchivos = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Obtener mensajes con archivos (no imágenes)
    const messages = await GroupMessage.find({
      grupo: id,
      isDeleted: false,
      $or: [
        { 'files.tipo': { $in: ['video', 'audio', 'file', 'documento', 'archivo'] } },
        { tipo: { $in: ['archivo', 'video'] } }
      ]
    })
      .populate('author', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    // Transformar mensajes para agregar attachments desde files
    const transformedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      // Mapear files a attachments para compatibilidad con frontend
      if (msgObj.files && msgObj.files.length > 0) {
        msgObj.attachments = msgObj.files.map(f => ({
          type: f.tipo,
          url: f.url,
          name: f.nombre,
          size: f.tamaño
        }));
      }
      // Mapear author a sender para compatibilidad con frontend
      msgObj.sender = msgObj.author;
      return msgObj;
    });

    res.json(formatSuccessResponse('Archivos obtenidos', transformedMessages));
  } catch (error) {
    console.error('Error al obtener archivos:', error);
    res.status(500).json(formatErrorResponse('Error al obtener archivos', [error.message]));
  }
};

/**
 * Obtener multimedia (imágenes) del grupo
 * GET /api/grupos/:id/multimedia
 */
const getMultimedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Obtener mensajes con imágenes
    const messages = await GroupMessage.find({
      grupo: id,
      isDeleted: false,
      $or: [
        { 'files.tipo': { $regex: /^image/i } },
        { tipo: 'imagen' }
      ]
    })
      .populate('author', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    // Transformar mensajes para agregar attachments desde files
    const transformedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      // Mapear files a attachments para compatibilidad con frontend
      if (msgObj.files && msgObj.files.length > 0) {
        msgObj.attachments = msgObj.files.map(f => ({
          type: f.tipo,
          url: f.url,
          name: f.nombre,
          size: f.tamaño
        }));
      }
      // Mapear author a sender para compatibilidad con frontend
      msgObj.sender = msgObj.author;
      return msgObj;
    });

    res.json(formatSuccessResponse('Multimedia obtenida', transformedMessages));
  } catch (error) {
    console.error('Error al obtener multimedia:', error);
    res.status(500).json(formatErrorResponse('Error al obtener multimedia', [error.message]));
  }
};

/**
 * Enviar mensaje con archivos adjuntos
 * POST /api/grupos/:id/messages/upload
 */
const sendMessageWithFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, replyTo, clientTempId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar que el grupo existe y el usuario es miembro
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
    if (!isMember && !group.creador.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No eres miembro de este grupo'));
    }

    // Procesar archivos subidos y subirlos a R2
    const files = await Promise.all((req.files || []).map(async (file) => {
      let tipo = 'file';
      if (file.mimetype.startsWith('image/')) tipo = 'image';
      else if (file.mimetype.startsWith('video/')) tipo = 'video';
      else if (file.mimetype.startsWith('audio/')) tipo = 'audio';

      // Subir archivo a R2
      const fileUrl = await uploadToR2(file.buffer, file.originalname, 'group-attachments');

      return {
        url: fileUrl,
        nombre: file.originalname,
        tipo: tipo,
        tamaño: file.size
      };
    }));

    // Determinar el tipo de mensaje
    let tipoMensaje = 'texto';
    if (files.length > 0) {
      const firstFileType = files[0].tipo;
      if (firstFileType === 'image') tipoMensaje = 'imagen';
      else if (firstFileType === 'video') tipoMensaje = 'video';
      else tipoMensaje = 'archivo';
    }

    // Crear mensaje - Si no hay content pero hay archivos, usar un placeholder
    const messageData = {
      grupo: id,
      author: req.userId,
      content: content && content.trim() ? content.trim() : (files.length > 0 ? ' ' : ''),
      tipo: tipoMensaje,
      files: files
    };

    if (replyTo && isValidObjectId(replyTo)) {
      messageData.replyTo = replyTo;
    }

    const message = new GroupMessage(messageData);
    await message.save();

    // Incrementar contador de mensajes
    const updateFields = { $inc: { 'estadisticas.totalMensajes': 1 } };

    // Si tiene archivos, incrementar contador de archivos
    if (files && files.length > 0) {
      updateFields.$inc['estadisticas.totalArchivos'] = files.length;
    }

    await Group.findByIdAndUpdate(id, updateFields);

    // Poblar datos
    await message.populate([
      { path: 'author', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      {
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'nombres.primero apellidos.primero social.fotoPerfil'
        }
      }
    ]);

    // Transformar a objeto y agregar attachments para compatibilidad con frontend
    const messageObj = message.toObject();
    // Mapear files a attachments para compatibilidad
    messageObj.attachments = (messageObj.files || []).map(f => ({
      type: f.tipo,
      url: f.url,
      name: f.nombre,
      size: f.tamaño
    }));

    // Emitir mensaje en tiempo real
    if (global.io) {
      const roomName = `group:${id}`;
      const emitted = { ...messageObj };
      if (clientTempId) emitted.clientTempId = clientTempId;
      global.io.to(roomName).emit('groupMessage', emitted);
    }

    res.status(201).json(formatSuccessResponse('Mensaje con archivos enviado', messageObj));
  } catch (error) {
    console.error('Error al enviar mensaje con archivos:', error);
    res.status(500).json(formatErrorResponse('Error al enviar mensaje', [error.message]));
  }
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  deleteGroup,
  uploadGroupAvatar,
  deleteGroupAvatar,
  // Join requests
  approveJoinRequest,
  rejectJoinRequest,
  // Member management
  updateMemberRole,
  removeMember,
  transferOwnership,
  // Message functions
  getMessages,
  sendMessage,
  sendMessageWithFiles,
  deleteMessage,
  reactToMessage,
  toggleStarMessage,
  markMessageAsRead,
  // Media & Files
  getArchivos,
  getMultimedia,
  // Starred & Links
  getDestacados,
  getEnlaces
};
