const Meeting = require('../models/Meeting.js');
const User = require('../models/User.model.js');
const Notification = require('../models/Notification.js');

// Helper: Crear notificación de reunión
const createMeetingNotification = async (receptorId, emisorId, tipo, contenido, meetingId) => {
  try {
    const notification = new Notification({
      receptor: receptorId,
      emisor: emisorId,
      tipo: 'evento',
      contenido: contenido,
      referencia: {
        tipo: 'Meeting',
        id: meetingId
      },
      metadata: {
        meetingId: meetingId,
        eventType: tipo
      }
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

const createMeeting = async (req, res) => {
  const {
    title, description, date, time, duration, meetLink,
    type, group, iglesia, attendees, targetMinistry,
    timezone, startsAt
  } = req.body;
  const creatorId = req.user.id;

  try {
    // 🌍 CALCULO DE FECHA UTC REAL (startsAt)
    // El frontend enviará startsAt ya calculado en UTC preferiblemente.
    // Si no viene, hacemos un fallback asumiendo UTC.
    let startsAtFinal = startsAt;

    if (!startsAtFinal) {
      startsAtFinal = new Date(`${date}T${time}:00Z`);
    }

    const newMeeting = new Meeting({
      creator: creatorId,
      group: group || null,
      iglesia: iglesia || null,
      title,
      description,
      startsAt: startsAtFinal, // 🔥 Almacenamos instante universal
      timezone: timezone || 'UTC',
      date, // Mantenemos por compatibilidad legacy
      time, // Mantenemos por compatibilidad legacy
      duration,
      meetLink,
      type,
      targetMinistry: targetMinistry || 'todos',
      attendees: [...new Set([creatorId, ...(attendees || [])])],
    });

    await newMeeting.save();

    await newMeeting.populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil');
    await newMeeting.populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil');

    if (global.emitMeetingUpdate) {
      const attendeeIds = newMeeting.attendees.map(a => (a._id || a).toString());
      global.emitMeetingUpdate(attendeeIds, newMeeting, 'create');
    }

    let recipientsIds = [];

    if (iglesia) {
      const ministryTarget = targetMinistry || 'todos';

      if (ministryTarget === 'todos') {
        const members = await User.find({
          'eclesiastico.iglesia': iglesia,
          'eclesiastico.activo': true
        }).select('_id');
        recipientsIds = members.map(m => m._id.toString());
      } else {
        const members = await User.find({
          'eclesiastico.iglesia': iglesia,
          'eclesiastico.activo': true,
          'eclesiastico.ministerios.nombre': ministryTarget,
          'eclesiastico.ministerios.activo': true
        }).select('_id');
        recipientsIds = members.map(m => m._id.toString());
      }
    } else {
      recipientsIds = newMeeting.attendees
        .map(a => (a._id || a).toString())
        .filter(id => id !== creatorId);
    }

    const finalRecipients = [...new Set(recipientsIds)].filter(id => id !== creatorId);

    for (const attendeeId of finalRecipients) {
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
    const user = await User.findById(userId).select('eclesiastico');
    let query = { attendees: userId };

    if (user?.eclesiastico?.iglesia && user.eclesiastico.activo) {
      const iglesiaId = user.eclesiastico.iglesia;
      const myMinistries = user.eclesiastico.ministerios
        ?.filter(m => m.activo)
        .map(m => m.nombre) || [];

      query = {
        $or: [
          { attendees: userId },
          {
            iglesia: iglesiaId,
            status: { $ne: 'cancelled' },
            $or: [
              { targetMinistry: 'todos' },
              { targetMinistry: { $in: myMinistries } }
            ]
          }
        ]
      };
    }

    const meetings = await Meeting.find(query)
      .populate('creator', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('attendees', 'nombres.primero apellidos.primero email social.fotoPerfil')
      .sort({ startsAt: 1, date: 1 }); // Priorizamos startsAt para el orden

    const now = new Date();

    for (const meeting of meetings) {
      if (meeting.status === 'cancelled') continue;

      // 🕒 Lógica de estado adaptativa (UTC vs Legacy)
      let meetingDateTime;
      if (meeting.startsAt) {
        meetingDateTime = new Date(meeting.startsAt);
      } else {
        // Fallback para reuniones antiguas
        const year = meeting.date.getUTCFullYear();
        const month = meeting.date.getUTCMonth();
        const day = meeting.date.getUTCDate();
        const [hours, minutes] = (meeting.time || '00:00').split(':').map(Number);
        meetingDateTime = new Date(year, month, day, hours, minutes, 0, 0);
      }

      let durationMinutes = 60;
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

      if (now < meetingDateTime) {
        newStatus = 'upcoming';
      } else if (now >= meetingDateTime && now < meetingEndTime) {
        newStatus = 'in-progress';
      } else if (now >= meetingEndTime) {
        newStatus = 'completed';
      }

      if (newStatus !== meeting.status) {
        const oldStatus = meeting.status;
        meeting.status = newStatus;
        await meeting.save();

        if (global.emitMeetingUpdate) {
          const attendeeIds = meeting.attendees.map(id => id._id ? id._id.toString() : id.toString());
          global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
        }

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

    if (meeting.creator.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede cancelar la reunión.'
      });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una reunión completada.'
      });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    if (global.emitMeetingUpdate) {
      const attendeeIds = meeting.attendees.map(id => id.toString());
      global.emitMeetingUpdate(attendeeIds, meeting, 'cancel');
    }

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
      .sort({ startsAt: 1, date: 1 });
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
