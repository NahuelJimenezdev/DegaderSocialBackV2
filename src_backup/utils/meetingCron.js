const cron = require('node-cron');
const Meeting = require('../models/Meeting');
const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

/**
 * Tarea cron que se ejecuta cada minuto para:
 * 1. Actualizar estados de reuniones automáticamente
 * 2. Enviar recordatorios 5 minutos antes
 */
const startMeetingCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const meetings = await Meeting.find({
        status: { $ne: 'cancelled' }
      }).populate('creator', 'nombre apellido')
        .populate('attendees', 'nombre apellido');

      for (const meeting of meetings) {
        // 🕒 Calcular tiempos
        let meetingDateTime;
        if (meeting.startsAt) {
          meetingDateTime = new Date(meeting.startsAt);
        } else {
          meetingDateTime = new Date(meeting.date);
          const [h, m] = (meeting.time || '00:00').split(':');
          meetingDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
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

        // 1️⃣ ACTUALIZAR ESTADOS
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
            const attendeeIds = meeting.attendees.map(a => a._id.toString());
            global.emitMeetingUpdate(attendeeIds, meeting, 'statusChange');
          }

          // Notificación de Inicio (CONCURRENTE - V1 PRO)
          if (oldStatus === 'upcoming' && newStatus === 'in-progress') {
            await triggerMassNotification(meeting, 'meeting_starting', `La reunión "${meeting.title}" ha comenzado`);
          }

          logger.info(`📅 [CRON] Reunión "${meeting.title}" -> ${newStatus}`);
        }

        // 2️⃣ RECORDATORIOS
        if (meeting.status === 'upcoming') {
          const timeDiff = meetingDateTime.getTime() - now.getTime();
          const minutesUntilStart = Math.floor(timeDiff / 60000);

          if (minutesUntilStart >= 4 && minutesUntilStart <= 6) {
            await triggerMassNotification(meeting, 'meeting_reminder', `La reunión "${meeting.title}" comienza en ${minutesUntilStart} minutos`);
          }
        }
      }
    } catch (error) {
      logger.error('❌ [CRON] Error en tarea de reuniones:', error);
    }
  });

  logger.info('✅ [CRON] Tarea de reuniones iniciada.');
};

/**
 * Disparador de notificaciones masivas optimizado
 */
async function triggerMassNotification(meeting, type, content) {
  try {
    const Notification = require('../models/Notification');
    const existing = await Notification.findOne({
      'metadata.meetingId': meeting._id,
      'metadata.eventType': type
    });

    if (existing) return;

    // 🚀 Promise.allSettled para evitar el "Loop Mortal"
    // Esto aprovecha la concurrencia de Node sin bloquear el cron
    const notificationPromises = meeting.attendees.map(attendee => 
      notificationService.notify({
        receptorId: attendee._id,
        emisorId: meeting.creator._id,
        tipo: 'evento',
        contenido: content,
        referencia: { tipo: 'Meeting', id: meeting._id },
        metadata: { meetingId: meeting._id, eventType: type }
      })
    );

    await Promise.allSettled(notificationPromises);
    logger.info(`⏰ [CRON] Notificación "${type}" enviada a ${meeting.attendees.length} asistentes.`);
  } catch (err) {
    logger.error(`Error en notificación masiva: ${err.message}`);
  }
}

module.exports = { startMeetingCron };
