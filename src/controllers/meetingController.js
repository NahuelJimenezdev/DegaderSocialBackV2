const Meeting = require('../models/Meeting.model');
const User = require('../models/User.model.js');
const Group = require('../models/Group.model');
const notificationService = require('../services/notification.service');
const Friendship = require('../models/Friendship.model');

// ─────────────────────────────────────────────
// Helper: Crear notificación de reunión
// ─────────────────────────────────────────────
const createMeetingNotification = async (receptorId, emisorId, tipo, contenido, meetingId) => {
  try {
    // 🏆 Notificación V1 PRO
    return await notificationService.notify({
      receptorId,
      emisorId,
      tipo: 'evento',
      contenido,
      referencia: { tipo: 'Meeting', id: meetingId },
      metadata: { meetingId, eventType: tipo }
    });
  } catch (error) {
    console.error('Error al crear notificación de reunión:', error.message);
  }
};

// ─────────────────────────────────────────────
// Helper: Determinar visibilidad según tipo
// ─────────────────────────────────────────────
const getVisibilityForType = (type) => {
  if (type === 'grupal') return 'group';
  if (type === 'publica') return 'public';
  return 'private'; // privado y tipos de iglesia
};

// ─────────────────────────────────────────────
// POST /api/reuniones — Crear reunión
// ─────────────────────────────────────────────
const createMeeting = async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', '🚀 [CREATE_MEETING] Inicio del proceso');
  console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));
  
  const {
    title, description, date, time, duration, meetLink,
    type, group, iglesia, attendees: invitedFromForm, targetMinistry,
    timezone, startsAt
  } = req.body;

  // 🛡️ CORRECCIÓN: Capturar ID de varias posibles fuentes en req
  const creatorId = req.userId || req.user?._id || req.user?.id;
  console.log('👤 Creador ID detectado:', creatorId);

  if (!creatorId) {
    console.error('❌ [AUTH_ERROR] No se pudo determinar el ID del creador.');
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  try {
    let startsAtFinal = startsAt;
    if (!startsAtFinal) {
      console.log('⚠️ No viene startsAt, intentando construir desde date y time...');
      console.log('📅 Date:', date, '⏰ Time:', time);
      startsAtFinal = new Date(`${date}T${time}:00Z`);
      console.log('✅ startsAtFinal construido:', startsAtFinal);
    } else {
      console.log('✅ startsAt recibido:', startsAtFinal);
    }

    const visibility = getVisibilityForType(type);
    console.log('👁️ Visibilidad determinada:', visibility, 'para tipo:', type);

    const newMeeting = new Meeting({
      creator: creatorId,
      group: group || null,
      iglesia: iglesia || null,
      title,
      description,
      startsAt: startsAtFinal,
      timezone: timezone || 'UTC',
      date,
      time,
      duration,
      meetLink,
      type,
      visibility,
      targetMinistry: targetMinistry || 'todos',
      attendees: [creatorId],
      invitedUsers: [...new Set((invitedFromForm || []).filter(id => id !== creatorId))],
    });

    console.log('💾 Intentando guardar nueva reunión en BD...');
    try {
      await newMeeting.save();
      console.log('✅ Reunión guardada con éxito. ID:', newMeeting._id);
    } catch (saveError) {
      console.error('❌ Error específico de Mongoose al guardar:', saveError);
      if (saveError.errors) {
        Object.keys(saveError.errors).forEach(key => {
          console.error(`   - Campo [${key}]: ${saveError.errors[key].message}`);
        });
      }
      throw saveError;
    }

    console.log('🔄 Populando datos de creador y asistentes...');
    await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
    await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');

    if (global.emitMeetingUpdate) {
      console.log('📡 Emitiendo actualización via WebSocket...');
      global.emitMeetingUpdate([creatorId], newMeeting, 'create');
    }

    let notifyIds = [];
    if (iglesia) {
      console.log('⛪ Contexto Iglesia detectado:', iglesia);
      const ministryTarget = targetMinistry || 'todos';
      const query = {
        'eclesiastico.iglesia': iglesia,
        'eclesiastico.activo': true,
        _id: { $ne: creatorId }
      };
      if (ministryTarget !== 'todos') {
        query['eclesiastico.ministerios.nombre'] = ministryTarget;
        query['eclesiastico.ministerios.activo'] = true;
      }
      console.log('🔍 Buscando usuarios para notificar (Iglesia) con query:', JSON.stringify(query));
      const members = await User.find(query).select('_id');
      notifyIds = members.map(m => m._id.toString());
      console.log(`📢 Se encontraron ${notifyIds.length} miembros de iglesia para notificar`);
    } else if (type === 'grupal' && group) {
      // Grupal: notificar a los miembros del grupo (excepto creador)
      const groupDoc = await Group.findById(group).select('miembros');
      if (groupDoc) {
        notifyIds = groupDoc.miembros
          .map(m => m.usuario.toString())
          .filter(id => id !== creatorId);
      }
    } else if (type === 'privado' || type === 'capacitacion') {
      // Privado: notificar solo a invitados específicos
      notifyIds = newMeeting.invitedUsers.map(id => id.toString());
    }
    // Pública: no notificar, solo se visualiza

    const finalNotifyIds = [...new Set(notifyIds)];
    console.log(`✉️ Iniciando envío de notificaciones a ${finalNotifyIds.length} usuarios...`);
    
    for (const userId of finalNotifyIds) {
      try {
        await createMeetingNotification(
          userId,
          creatorId,
          'meeting_created',
          `Te invitaron a la reunión "${title}"`,
          newMeeting._id
        );
      } catch (notifErr) {
        console.error(`❌ Fallo al notificar al usuario ${userId}:`, notifErr.message);
      }
    }

    console.log('🏁 Proceso completado con éxito. Enviando respuesta 201.');
    res.status(201).json({
      success: true,
      data: newMeeting,
      message: 'Reunión creada exitosamente.'
    });

  } catch (error) {
    console.error('💥 [CREATE_MEETING_ERROR] Fallo crítico:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: error.stack // Enviamos el stack para verlo en el front si es necesario durante el debug
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/reuniones/me — Reuniones del usuario
// ─────────────────────────────────────────────
const getMyMeetings = async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  console.log('\x1b[36m%s\x1b[0m', '🔍 [GET_MY_MEETINGS] Buscando reuniones para:', userId);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const user = await User.findById(userId).select('eclesiastico');

    // Buscar amigos del usuario para reuniones públicas
    const friendships = await Friendship.find({
      $or: [
        { solicitante: userId, estado: 'aceptada' },
        { receptor: userId, estado: 'aceptada' }
      ]
    });

    const friendIds = friendships.map(f =>
      f.solicitante.toString() === userId.toString() ? f.receptor.toString() : f.solicitante.toString()
    );
    console.log(`👫 Amigos detectados (aceptados): ${friendIds.length}`);

    // Query compuesta:
    let orConditions = [
      { creator: userId },    // 🛡️ CRÍTICO: Soy el creador (SIEMPRE debe estar)
      { attendees: userId },  // Soy asistente aprobado
      { invitedUsers: userId }, // Fui invitado directamente
    ];

    // Reuniones públicas de amigos
    if (friendIds.length > 0) {
      orConditions.push({
        visibility: 'public',
        creator: { $in: friendIds },
        status: { $ne: 'cancelled' }
      });
    }

    // Reuniones de iglesia
    if (user?.eclesiastico?.iglesia && user.eclesiastico.activo) {
      const iglesiaId = user.eclesiastico.iglesia;
      const myMinistries = user.eclesiastico.ministerios
        ?.filter(m => m.activo)
        .map(m => m.nombre) || [];

      orConditions.push({
        iglesia: iglesiaId,
        status: { $ne: 'cancelled' },
        $or: [
          { targetMinistry: 'todos' },
          { targetMinistry: { $in: myMinistries } }
        ]
      });
    }

    // Reuniones de grupos
    const myGroups = await Group.find({ 'miembros.usuario': userId }).select('_id');
    if (myGroups.length > 0) {
      const groupIds = myGroups.map(g => g._id);
      orConditions.push({
        visibility: 'group',
        group: { $in: groupIds },
        status: { $ne: 'cancelled' }
      });
    }

    console.log('📡 Ejecutando query OR con condiciones:', JSON.stringify(orConditions));
    const meetings = await Meeting.find({ $or: orConditions })
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil')
      .populate('invitedUsers', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendanceRequests.user', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('group', 'nombre imagen')
      .sort({ startsAt: 1, date: 1 });

    console.log(`✅ Se encontraron ${meetings.length} reuniones en total (antes de auto-status).`);

    const now = new Date();
    // Auto-actualización de estados según el tiempo actual
    for (const meeting of meetings) {
      if (meeting.status === 'cancelled') continue;

      let meetingDateTime;
      let timeStr = String(meeting.time || '00:00');
      if (!timeStr.includes(':')) timeStr = '00:00';

      if (meeting.startsAt) {
        meetingDateTime = new Date(meeting.startsAt);
      } else {
        // Fallback robusto si falta startsAt
        const baseDate = meeting.date instanceof Date ? meeting.date : new Date(meeting.date);
        const [hours, minutes] = timeStr.split(':').map(Number);
        meetingDateTime = new Date(baseDate);
        meetingDateTime.setUTCHours(hours, minutes, 0, 0);
      }

      if (isNaN(meetingDateTime.getTime())) meetingDateTime = new Date();

      let durationMinutes = 60;
      const durationStr = String(meeting.duration || '60');
      if (durationStr.includes('minutos')) durationMinutes = parseInt(durationStr) || 60;
      else if (durationStr.includes('hora')) durationMinutes = (parseFloat(durationStr) || 1) * 60;
      else durationMinutes = parseInt(durationStr) || 60;

      const meetingEndTime = new Date(meetingDateTime.getTime() + durationMinutes * 60000);
      let newStatus = meeting.status;

      if (now < meetingDateTime) newStatus = 'upcoming';
      else if (now >= meetingDateTime && now < meetingEndTime) newStatus = 'in-progress';
      else if (now >= meetingEndTime) newStatus = 'completed';

      if (newStatus !== meeting.status) {
        meeting.status = newStatus;
        await meeting.save();
        if (global.emitMeetingUpdate) {
          const attendeeIds = meeting.attendees.map(a => (a._id || a).toString());
          global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
        }
      }
    }

    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    console.error('💥 [GET_MY_MEETINGS_ERROR]:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las reuniones.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/request — Pedir asistir
// ─────────────────────────────────────────────
const requestAttendance = async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  const { id } = req.params;
  console.log('\x1b[35m%s\x1b[0m', `🙋 [REQUEST_ATTENDANCE] Usuario ${userId} pidiendo asistir a reunión: ${id}`);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const meeting = await Meeting.findById(id).populate('creator', 'nombres.primero apellidos.primero');

    if (!meeting) {
      console.log('❌ Reunión no encontrada');
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (!meeting.creator) {
      console.log('❌ El creador de esta reunión no existe');
      return res.status(404).json({ success: false, message: 'El creador de esta reunión ya no existe.' });
    }

    if (meeting.status === 'cancelled' || meeting.status === 'completed') {
      console.log(`❌ Estado inválido para solicitud: ${meeting.status}`);
      return res.status(400).json({ success: false, message: 'No se puede solicitar asistencia a esta reunión.' });
    }

    // Verificar si ya es attendee
    const isAttendee = (meeting.attendees || []).some(a => a.toString() === userId.toString());
    if (isAttendee) {
      console.log('ℹ️ El usuario ya es participante aprobado');
      return res.status(200).json({ success: true, message: 'Ya eres participante aprobado.' });
    }

    // Verificar si ya tiene una solicitud
    const existingRequest = (meeting.attendanceRequests || []).find(r => r.user.toString() === userId.toString());
    if (existingRequest) {
      console.log(`ℹ️ Solicitud ya existente con estado: ${existingRequest.status}`);
      return res.status(200).json({
        success: true,
        message: 'Ya tienes una solicitud registrada.',
        status: existingRequest.status
      });
    }

    // Agregar solicitud
    console.log('💾 Guardando nueva solicitud de asistencia...');
    meeting.attendanceRequests.push({ user: userId, status: 'pending' });
    await meeting.save();

    // Notificar al creador (en background para no bloquear)
    try {
      const requestingUser = await User.findById(userId).select('nombres apellidos');
      const userName = `${requestingUser?.nombres?.primero || ''} ${requestingUser?.apellidos?.primero || ''}`.trim();

      console.log(`📢 Notificando al creador (${meeting.creator._id}) sobre la solicitud de ${userName}`);
      await createMeetingNotification(
        meeting.creator._id,
        userId,
        'attendance_request',
        `${userName} quiere unirse a tu reunión "${meeting.title}"`,
        meeting._id
      );
    } catch (notifErr) {
      console.error('⚠️ Error al enviar notificación de solicitud:', notifErr.message);
    }

    console.log('✅ Solicitud procesada con éxito');
    res.status(200).json({ success: true, message: 'Solicitud de asistencia enviada.' });

  } catch (error) {
    console.error('💥 [REQUEST_ATTENDANCE_ERROR]:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la solicitud.', details: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/respond/:userId — Aceptar/Denegar asistencia
// ─────────────────────────────────────────────
const respondAttendance = async (req, res) => {
  const currentUserId = req.userId || req.user?._id || req.user?.id;
  const { id, userId } = req.params;
  const { action } = req.body; // 'approve' | 'deny'

  console.log('\x1b[33m%s\x1b[0m', `⚖️ [RESPOND_ATTENDANCE] Usuario ${currentUserId} respondiendo a ${userId} en reunión ${id}. Acción: ${action}`);

  if (!currentUserId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Acción inválida. Usa "approve" o "deny".' });
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    console.log(`🔍 Validando creador: MeetingCreator=${meeting.creator.toString()} | CurrentUser=${currentUserId}`);
    if (meeting.creator.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede gestionar asistentes.' });
    }

    const requestIndex = meeting.attendanceRequests.findIndex(r => r.user.toString() === userId);
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    // Actualizar estado de la solicitud
    meeting.attendanceRequests[requestIndex].status = action === 'approve' ? 'approved' : 'denied';

    if (action === 'approve') {
      // Agregar a attendees aprobados
      const alreadyAttendee = (meeting.attendees || []).some(a => a.toString() === userId.toString());
      if (!alreadyAttendee) {
        meeting.attendees.push(userId);
      }
    }

    await meeting.save();

    // Notificar al usuario su resultado
    try {
      const contenido = action === 'approve'
        ? `Tu solicitud para unirte a "${meeting.title}" fue aceptada`
        : `Tu solicitud para unirte a "${meeting.title}" fue denegada`;

      await createMeetingNotification(
        userId,
        currentUserId,
        action === 'approve' ? 'attendance_approved' : 'attendance_denied',
        contenido,
        meeting._id
      );
    } catch (notifErr) {
      console.error('⚠️ Error al enviar notificación de respuesta:', notifErr.message);
    }

    console.log('✅ Respuesta procesada con éxito');
    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Usuario aprobado.' : 'Usuario denegado.',
    });

  } catch (error) {
    console.error('💥 [RESPOND_ATTENDANCE_ERROR]:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la respuesta.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reuniones/:id/detail — Detalle para el creador
// ─────────────────────────────────────────────
const getCreatorMeetingDetail = async (req, res) => {
  const currentUserId = req.userId || req.user?._id || req.user?.id;
  const { id } = req.params;

  console.log('\x1b[34m%s\x1b[0m', `📋 [GET_CREATOR_DETAIL] Usuario ${currentUserId} pidiendo detalle de reunión ${id}`);

  if (!currentUserId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const meeting = await Meeting.findById(id)
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendees', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('invitedUsers', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendanceRequests.user', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('group', 'nombre imagen');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (!meeting.creator) {
      return res.status(404).json({ success: false, message: 'El creador de esta reunión ya no existe.' });
    }

    console.log(`🔍 Validando detalle: Creator=${meeting.creator._id.toString()} | Current=${currentUserId}`);
    if (meeting.creator._id.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede ver el detalle completo.' });
    }

    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    console.error('💥 [GET_CREATOR_DETAIL_ERROR]:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el detalle.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id — Editar reunión (solo creator)
// ─────────────────────────────────────────────
const updateMeeting = async (req, res) => {
  const currentUserId = req.userId || req.user?._id || req.user?.id;
  const { id } = req.params;
  const { title, description, meetLink, time, date, startsAt } = req.body;

  if (!currentUserId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.creator.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede editar la reunión.' });
    }

    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (meetLink) meeting.meetLink = meetLink;
    if (time) meeting.time = time;
    if (date) meeting.date = date;
    if (startsAt) meeting.startsAt = new Date(startsAt);

    await meeting.save();
    await meeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
    await meeting.populate('attendees', 'nombres.primero apellidos.primero social.fotoPerfil');

    // Notificar a attendees del cambio via WebSocket
    if (global.emitMeetingUpdate) {
      const attendeeIds = meeting.attendees
        .filter(a => a != null)
        .map(a => (a._id || a).toString());
      global.emitMeetingUpdate(attendeeIds, meeting, 'update');
    }

    res.status(200).json({ success: true, data: meeting, message: 'Reunión actualizada.' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar la reunión.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/join — Unirse (si está aprobado)
// ─────────────────────────────────────────────
const joinMeeting = async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    const isApproved = meeting.attendees.some(a => (a._id || a).toString() === userId.toString());
    if (!isApproved) {
      return res.status(403).json({ success: false, message: 'No tienes aprobación para unirte a esta reunión.' });
    }

    res.status(200).json({
      success: true,
      message: 'Acceso permitido.',
      meetLink: meeting.meetLink
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al unirse a la reunión.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/cancel — Cancelar reunión
// ─────────────────────────────────────────────
const cancelMeeting = async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  const { id } = req.params;

  console.log('\x1b[31m%s\x1b[0m', `🚫 [CANCEL_MEETING] Intentando cancelar reunión: ${id} por usuario: ${userId}`);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      console.log('❌ Reunión no encontrada');
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    console.log(`🔍 Validando creador: Creator=${meeting.creator.toString()} | CurrentUser=${userId}`);
    if (meeting.creator.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede cancelar la reunión.' });
    }

    if (meeting.status === 'completed') {
      console.log('⚠️ La reunión ya está completada, no se puede cancelar');
      return res.status(400).json({ success: false, message: 'No se puede cancelar una reunión completada.' });
    }

    meeting.status = 'cancelled';
    await meeting.save();
    console.log('✅ Reunión marcada como cancelada en BD');

    if (global.emitMeetingUpdate) {
      const attendeeIds = meeting.attendees
        .filter(a => a != null)
        .map(a => (a._id || a).toString());
      
      console.log(`📡 Emitiendo actualización de cancelación a ${attendeeIds.length} asistentes`);
      global.emitMeetingUpdate(attendeeIds, meeting, 'cancel');
    }

    const attendeesToNotify = meeting.attendees
      .filter(a => a != null)
      .filter(a => (a._id || a).toString() !== userId.toString());

    console.log(`📢 Enviando ${attendeesToNotify.length} notificaciones de cancelación...`);
    for (const attendee of attendeesToNotify) {
      const attendeeId = (attendee._id || attendee).toString();
      try {
        await createMeetingNotification(
          attendeeId,
          userId,
          'meeting_cancelled',
          `La reunión "${meeting.title}" ha sido cancelada`,
          meeting._id
        );
      } catch (notifErr) {
        console.error(`❌ Error al notificar cancelación a ${attendeeId}:`, notifErr.message);
      }
    }

    res.status(200).json({ success: true, message: 'Reunión cancelada exitosamente.', data: meeting });

  } catch (error) {
    console.error('💥 [CANCEL_MEETING_ERROR]:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al cancelar la reunión.',
      details: error.message 
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/reuniones/iglesia/:iglesiaId
// ─────────────────────────────────────────────
const getMeetingsByIglesia = async (req, res) => {
  const { iglesiaId } = req.params;
  try {
    const meetings = await Meeting.find({ iglesia: iglesiaId })
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .sort({ startsAt: 1, date: 1 });
    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener reuniones de la iglesia.' });
  }
};

module.exports = {
  createMeeting,
  getMyMeetings,
  requestAttendance,
  respondAttendance,
  getCreatorMeetingDetail,
  updateMeeting,
  joinMeeting,
  cancelMeeting,
  getMeetingsByIglesia,
};
