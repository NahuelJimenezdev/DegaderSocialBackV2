const Meeting = require('../models/Meeting.js');
const User = require('../models/User.model.js');
const Group = require('../models/Group.js');
const Notification = require('../models/Notification.js');
const Friendship = require('../models/Friendship.js');

// ─────────────────────────────────────────────
// Helper: Crear notificación de reunión
// ─────────────────────────────────────────────
const createMeetingNotification = async (receptorId, emisorId, tipo, contenido, meetingId) => {
  try {
    const notification = new Notification({
      receptor: receptorId,
      emisor: emisorId,
      tipo: 'evento',
      contenido: contenido,
      referencia: { tipo: 'Meeting', id: meetingId },
      metadata: { meetingId: meetingId, eventType: tipo }
    });
    await notification.save();
    await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');
    await notification.populate('receptor', 'nombres.primero apellidos.primero');
    if (global.emitNotification) {
      global.emitNotification(receptorId.toString(), notification);
    }
    return notification;
  } catch (error) {
    console.error('Error al crear notificación de reunión:', error);
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
  const {
    title, description, date, time, duration, meetLink,
    type, group, iglesia, attendees: invitedFromForm, targetMinistry,
    timezone, startsAt
  } = req.body;
  const creatorId = req.user.id;

  try {
    let startsAtFinal = startsAt;
    if (!startsAtFinal) {
      startsAtFinal = new Date(`${date}T${time}:00Z`);
    }

    const visibility = getVisibilityForType(type);

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
      // El creador ya es attendee aprobado desde el inicio
      attendees: [creatorId],
      // Los que el creador agregó manualmente son invitados (deben pedir asistir)
      invitedUsers: [...new Set((invitedFromForm || []).filter(id => id !== creatorId))],
    });

    await newMeeting.save();
    await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
    await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');

    // Emitir via WebSocket a los attendees actuales (solo el creador)
    if (global.emitMeetingUpdate) {
      global.emitMeetingUpdate([creatorId], newMeeting, 'create');
    }

    // ─── Notificaciones según tipo ───
    let notifyIds = [];

    if (iglesia) {
      // Contexto iglesia: notificar según ministerio
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
      const members = await User.find(query).select('_id');
      notifyIds = members.map(m => m._id.toString());
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
    for (const userId of finalNotifyIds) {
      await createMeetingNotification(
        userId,
        creatorId,
        'meeting_created',
        `Te invitaron a la reunión "${title}"`,
        newMeeting._id
      );
    }

    res.status(201).json({
      success: true,
      data: newMeeting,
      message: 'Reunión creada exitosamente.'
    });

  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/reuniones/me — Reuniones del usuario
// ─────────────────────────────────────────────
const getMyMeetings = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select('eclesiastico amigos');

    // Buscar amigos del usuario para reuniones públicas (usando el modelo Friendship)
    const friendships = await Friendship.find({
      $or: [
        { solicitante: userId, estado: 'aceptada' },
        { receptor: userId, estado: 'aceptada' }
      ]
    });

    const friendIds = friendships.map(f =>
      f.solicitante.toString() === userId ? f.receptor.toString() : f.solicitante.toString()
    );

    // Query compuesta:
    // 1. Reuniones donde soy attendee (aprobado) o creador
    // 2. Reuniones públicas de mis amigos
    // 3. Reuniones grupales de grupos donde soy miembro
    // 4. Reuniones donde fui invitado
    // 5. Reuniones de iglesia si soy miembro
    let orConditions = [
      { attendees: userId },
      { creator: userId },
      { invitedUsers: userId },
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

    // Reuniones grupales de grupos donde soy miembro
    const myGroups = await Group.find({ 'miembros.usuario': userId }).select('_id');
    if (myGroups.length > 0) {
      const groupIds = myGroups.map(g => g._id);
      orConditions.push({
        visibility: 'group',
        group: { $in: groupIds },
        status: { $ne: 'cancelled' }
      });
    }

    const meetings = await Meeting.find({ $or: orConditions })
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil')
      .populate('invitedUsers', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendanceRequests.user', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('group', 'nombre imagen')
      .sort({ startsAt: 1, date: 1 });

    const now = new Date();

    for (const meeting of meetings) {
      if (meeting.status === 'cancelled') continue;

      let meetingDateTime;
      if (meeting.startsAt) {
        meetingDateTime = new Date(meeting.startsAt);
      } else {
        const year = meeting.date.getUTCFullYear();
        const month = meeting.date.getUTCMonth();
        const day = meeting.date.getUTCDate();
        const [hours, minutes] = (meeting.time || '00:00').split(':').map(Number);
        meetingDateTime = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
      }

      let durationMinutes = 60;
      if (meeting.duration) {
        if (meeting.duration.includes('minutos')) {
          durationMinutes = parseInt(meeting.duration);
        } else if (meeting.duration.includes('hora')) {
          durationMinutes = parseFloat(meeting.duration) * 60;
        }
      }

      const meetingEndTime = new Date(meetingDateTime.getTime() + durationMinutes * 60000);
      let newStatus = meeting.status;

      if (now < meetingDateTime) {
        newStatus = 'upcoming';
      } else if (now >= meetingDateTime && now < meetingEndTime) {
        newStatus = 'in-progress';
      } else if (now >= meetingEndTime) {
        newStatus = 'completed';
      }

      if (newStatus !== meeting.status) {
        meeting.status = newStatus;
        await meeting.save();

        // Solo WebSocket, las notificaciones push van por el cron exclusivamente
        if (global.emitMeetingUpdate) {
          const attendeeIds = meeting.attendees.map(id => id._id ? id._id.toString() : id.toString());
          global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
        }
      }
    }

    res.status(200).json({ success: true, data: meetings });

  } catch (error) {
    console.error('Error en getMyMeetings:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las reuniones.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/request — Pedir asistir
// ─────────────────────────────────────────────
const requestAttendance = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const meeting = await Meeting.findById(id).populate('creator', 'nombres.primero apellidos.primero');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.status === 'cancelled' || meeting.status === 'completed') {
      return res.status(400).json({ success: false, message: 'No se puede solicitar asistencia a esta reunión.' });
    }

    // Verificar si ya es attendee
    const isAttendee = meeting.attendees.some(a => a.toString() === userId);
    if (isAttendee) {
      return res.status(200).json({ success: true, message: 'Ya eres participante aprobado.' });
    }

    // Verificar si ya tiene una solicitud
    const existingRequest = meeting.attendanceRequests.find(r => r.user.toString() === userId);
    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: 'Ya tienes una solicitud registrada.',
        status: existingRequest.status
      });
    }

    // Agregar solicitud
    meeting.attendanceRequests.push({ user: userId, status: 'pending' });
    await meeting.save();

    // Notificar al creador
    const requestingUser = await User.findById(userId).select('nombres apellidos social');
    const userName = `${requestingUser?.nombres?.primero || ''} ${requestingUser?.apellidos?.primero || ''}`.trim();

    await createMeetingNotification(
      meeting.creator._id,
      userId,
      'attendance_request',
      `${userName} quiere unirse a tu reunión "${meeting.title}"`,
      meeting._id
    );

    res.status(200).json({ success: true, message: 'Solicitud de asistencia enviada.' });

  } catch (error) {
    console.error('Error en requestAttendance:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la solicitud.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id/respond/:userId — Aceptar/Denegar asistencia
// ─────────────────────────────────────────────
const respondAttendance = async (req, res) => {
  const creatorId = req.user.id;
  const { id, userId } = req.params;
  const { action } = req.body; // 'approve' | 'deny'

  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Acción inválida. Usa "approve" o "deny".' });
  }

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.creator.toString() !== creatorId) {
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
      const alreadyAttendee = meeting.attendees.some(a => a.toString() === userId);
      if (!alreadyAttendee) {
        meeting.attendees.push(userId);
      }
    }

    await meeting.save();

    // Notificar al usuario su resultado
    const contenido = action === 'approve'
      ? `Tu solicitud para unirte a "${meeting.title}" fue aceptada`
      : `Tu solicitud para unirte a "${meeting.title}" fue denegada`;

    await createMeetingNotification(
      userId,
      creatorId,
      action === 'approve' ? 'attendance_approved' : 'attendance_denied',
      contenido,
      meeting._id
    );

    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Usuario aprobado.' : 'Usuario denegado.',
    });

  } catch (error) {
    console.error('Error en respondAttendance:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la respuesta.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reuniones/:id/detail — Detalle para el creador
// ─────────────────────────────────────────────
const getCreatorMeetingDetail = async (req, res) => {
  const creatorId = req.user.id;
  const { id } = req.params;

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

    if (meeting.creator._id.toString() !== creatorId) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede ver el detalle completo.' });
    }

    res.status(200).json({ success: true, data: meeting });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener el detalle.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reuniones/:id — Editar reunión (solo creator)
// ─────────────────────────────────────────────
const updateMeeting = async (req, res) => {
  const creatorId = req.user.id;
  const { id } = req.params;
  const { title, description, meetLink, time, date, startsAt } = req.body;

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.creator.toString() !== creatorId) {
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
      const attendeeIds = meeting.attendees.map(a => (a._id || a).toString());
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
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    const isApproved = meeting.attendees.some(a => a.toString() === userId);
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
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.creator.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede cancelar la reunión.' });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({ success: false, message: 'No se puede cancelar una reunión completada.' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    if (global.emitMeetingUpdate) {
      const attendeeIds = meeting.attendees.map(id => id.toString());
      global.emitMeetingUpdate(attendeeIds, meeting, 'cancel');
    }

    const attendeesToNotify = meeting.attendees.filter(a => a.toString() !== userId);
    for (const attendeeId of attendeesToNotify) {
      await createMeetingNotification(
        attendeeId,
        userId,
        'meeting_cancelled',
        `La reunión "${meeting.title}" ha sido cancelada`,
        meeting._id
      );
    }

    res.status(200).json({ success: true, message: 'Reunión cancelada exitosamente.', data: meeting });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cancelar la reunión.' });
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
