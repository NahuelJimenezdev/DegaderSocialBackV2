const Meeting = require('../models/Meeting.js');
const User = require('../models/User.model.js');
const Notification = require('../models/Notification.js');

// Helper: Crear notificación de reunión
const createMeetingNotification = async (receptorId, emisorId, tipo, contenido, meetingId) => {
  try {
    const notification = new Notification({
      receptor: receptorId,
      emisor: emisorId,
      tipo: 'evento', // Tipo 'evento' ya existe en el schema
      contenido: contenido,
      referencia: {
        tipo: 'Meeting',
        id: meetingId
      },
      metadata: {
        meetingId: meetingId,
        eventType: tipo // 'meeting_reminder', 'meeting_cancelled', 'meeting_starting', 'meeting_created'
      }
    });

    await notification.save();

    // Poblar datos del emisor antes de emitir
    await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');
    await notification.populate('receptor', 'nombres.primero apellidos.primero');

    // Emitir notificación via Socket.IO
    if (global.emitNotification) {
      global.emitNotification(receptorId.toString(), notification);
    }

    return notification;
  } catch (error) {
    console.error('Error al crear notificación de reunión:', error);
  }
};

const createMeeting = async (req, res) => {
  const { title, description, date, time, duration, meetLink, type, group, iglesia, attendees } = req.body;
  const creatorId = req.user.id;

  try {
    const newMeeting = new Meeting({
      creator: creatorId,
      group: group || null,
      iglesia: iglesia || null,
      title,
      description,
      date,
      time,
      duration,
      meetLink,
      type,
      attendees: [...new Set([creatorId, ...(attendees || [])])],
    });

    await newMeeting.save();

    // Poblar datos antes de emitir
    await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
    await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');

    // 🔔 Emitir evento Socket.IO a todos los asistentes
    if (global.emitMeetingUpdate) {
      const attendeeIds = newMeeting.attendees.map(a => (a._id || a).toString());
      global.emitMeetingUpdate(attendeeIds, newMeeting, 'create');
    }

    // 📬 Crear notificaciones para todos los asistentes (excepto el creador)
    const attendeesToNotify = newMeeting.attendees.filter(a => {
      const attendeeId = (a._id || a).toString();
      return attendeeId !== creatorId;
    });
    for (const attendee of attendeesToNotify) {
      const attendeeId = attendee._id || attendee;
      await createMeetingNotification(
        attendeeId,
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

const getMyMeetings = async (req, res) => {
  const userId = req.user.id;

  try {
    const meetings = await Meeting.find({ attendees: userId })
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil')
      .sort({ date: 1, time: 1 });

    // 🔄 Actualizar automáticamente el estado de las reuniones según la fecha/hora
    const now = new Date();

    for (const meeting of meetings) {
      if (meeting.status === 'cancelled') continue; // No cambiar reuniones canceladas

      const meetingDateTime = new Date(meeting.date);
      const [hours, minutes] = (meeting.time || '00:00').split(':');
      meetingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Calcular duración en minutos (asumiendo formato "X horas" o "X minutos")
      let durationMinutes = 60; // Por defecto 1 hora
      if (meeting.duration) {
        if (meeting.duration.includes('minutos')) {
          durationMinutes = parseInt(meeting.duration);
        } else if (meeting.duration.includes('hora')) {
          const hours = parseFloat(meeting.duration);
          durationMinutes = hours * 60;
        }
      }

      const meetingEndTime = new Date(meetingDateTime.getTime() + durationMinutes * 60000);

      let newStatus = meeting.status;

      // Determinar nuevo estado
      if (now < meetingDateTime) {
        newStatus = 'upcoming';
      } else if (now >= meetingDateTime && now < meetingEndTime) {
        newStatus = 'in-progress';
      } else if (now >= meetingEndTime) {
        newStatus = 'completed';
      }

      // Actualizar si cambió
      if (newStatus !== meeting.status) {
        const oldStatus = meeting.status;
        meeting.status = newStatus;
        await meeting.save();

        // 🔔 Emitir cambio de estado en tiempo real
        if (global.emitMeetingUpdate) {
          const attendeeIds = meeting.attendees.map(id => id._id ? id._id.toString() : id.toString());
          global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
        }

        // 📬 Notificar cuando la reunión comienza (upcoming → in-progress)
        if (oldStatus === 'upcoming' && newStatus === 'in-progress') {
          const attendeeIds = meeting.attendees.map(id => id._id || id);
          for (const attendeeId of attendeeIds) {
            await createMeetingNotification(
              attendeeId,
              meeting.creator._id || meeting.creator,
              'meeting_starting',
              `La reunión "${meeting.title}" ha comenzado`,
              meeting._id
            );
          }
        }
      }
    }

    res.status(200).json({ success: true, data: meetings });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener las reuniones.' });
  }
};

const joinMeeting = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    if (meeting.attendees.includes(userId)) {
      return res.status(200).json({
        success: true,
        message: 'Ya eres participante de esta reunión.'
      });
    }

    meeting.attendees.push(userId);
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Te has unido a la reunión exitosamente.',
      data: meeting
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al unirse a la reunión.' });
  }
};

const cancelMeeting = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Reunión no encontrada.' });
    }

    // Solo el creador puede cancelar la reunión
    if (meeting.creator.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede cancelar la reunión.'
      });
    }

    // No permitir cancelar reuniones ya completadas
    if (meeting.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una reunión completada.'
      });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // 🔔 Emitir cancelación en tiempo real a todos los asistentes
    if (global.emitMeetingUpdate) {
      const attendeeIds = meeting.attendees.map(id => id.toString());
      global.emitMeetingUpdate(attendeeIds, meeting, 'cancel');
    }

    // 📬 Notificar cancelación a todos los asistentes (excepto el creador)
    const attendeesToNotify = meeting.attendees.filter(id => id.toString() !== userId);
    for (const attendeeId of attendeesToNotify) {
      await createMeetingNotification(
        attendeeId,
        userId,
        'meeting_cancelled',
        `La reunión "${meeting.title}" ha sido cancelada`,
        meeting._id
      );
    }

    res.status(200).json({
      success: true,
      message: 'Reunión cancelada exitosamente.',
      data: meeting
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cancelar la reunión.' });
  }
};

const getMeetingsByIglesia = async (req, res) => {
  const { iglesiaId } = req.params;
  try {
    const meetings = await Meeting.find({ iglesia: iglesiaId })
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .sort({ date: 1, time: 1 });
    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener reuniones de la iglesia.' });
  }
};


module.exports = {
  createMeeting,
  getMyMeetings,
  joinMeeting,
  cancelMeeting,
  getMeetingsByIglesia,
};
