const cron = require('node-cron');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');

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

    // Poblar datos del emisor antes de emitir
    await notification.populate('emisor', 'nombre apellido avatar');
    await notification.populate('receptor', 'nombre apellido');

    // Emitir notificación via Socket.IO
    if (global.emitNotification) {
      global.emitNotification(receptorId.toString(), notification);
    }

    return notification;
  } catch (error) {
    console.error('Error al crear notificación de reunión:', error);
  }
};

/**
 * Tarea cron que se ejecuta cada minuto para:
 * 1. Actualizar estados de reuniones automáticamente
 * 2. Enviar recordatorios 5 minutos antes
 */
const startMeetingCron = () => {
  // Ejecutar cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);

      // Buscar todas las reuniones activas (no canceladas)
      const meetings = await Meeting.find({
        status: { $ne: 'cancelled' }
      }).populate('creator', 'nombre apellido')
        .populate('attendees', 'nombre apellido');

      for (const meeting of meetings) {
        const meetingDateTime = new Date(meeting.date);
        const [hours, minutes] = (meeting.time || '00:00').split(':');
        meetingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Calcular duración en minutos
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

        // 1️⃣ ACTUALIZAR ESTADOS AUTOMÁTICAMENTE
        let newStatus = meeting.status;

        if (now < meetingDateTime) {
          newStatus = 'upcoming';
        } else if (now >= meetingDateTime && now < meetingEndTime) {
          newStatus = 'in-progress';
        } else if (now >= meetingEndTime) {
          newStatus = 'completed';
        }

        // Si cambió el estado, actualizar y emitir
        if (newStatus !== meeting.status) {
          const oldStatus = meeting.status;
          meeting.status = newStatus;
          await meeting.save();

          // Emitir cambio de estado vía WebSocket
          if (global.emitMeetingUpdate) {
            const attendeeIds = meeting.attendees.map(a => a._id.toString());
            global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
          }

          // Notificar cuando comienza
          if (oldStatus === 'upcoming' && newStatus === 'in-progress') {
            for (const attendee of meeting.attendees) {
              await createMeetingNotification(
                attendee._id,
                meeting.creator._id,
                'meeting_starting',
                `La reunión "${meeting.title}" ha comenzado`,
                meeting._id
              );
            }
          }

          console.log(`📅 [CRON] Reunión "${meeting.title}" cambió de ${oldStatus} a ${newStatus}`);
        }

        // 2️⃣ ENVIAR RECORDATORIO 5 MINUTOS ANTES
        if (meeting.status === 'upcoming') {
          const timeDiff = meetingDateTime.getTime() - now.getTime();
          const minutesUntilStart = Math.floor(timeDiff / 60000);

          // Si faltan exactamente 5 minutos (con margen de 1 minuto por el cron)
          if (minutesUntilStart >= 4 && minutesUntilStart <= 6) {
            // Verificar que no se haya enviado ya un recordatorio
            const existingReminder = await Notification.findOne({
              'metadata.meetingId': meeting._id,
              'metadata.eventType': 'meeting_reminder'
            });

            if (!existingReminder) {
              // Enviar recordatorio a todos los asistentes
              for (const attendee of meeting.attendees) {
                await createMeetingNotification(
                  attendee._id,
                  meeting.creator._id,
                  'meeting_reminder',
                  `La reunión "${meeting.title}" comienza en ${minutesUntilStart} minutos`,
                  meeting._id
                );
              }

              console.log(`⏰ [CRON] Recordatorio enviado para reunión "${meeting.title}"`);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [CRON] Error en tarea de reuniones:', error);
    }
  });

  console.log('✅ [CRON] Tarea de reuniones iniciada - Se ejecuta cada minuto');
};

module.exports = { startMeetingCron };
