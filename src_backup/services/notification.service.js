const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');
const logger = require('../config/logger');

// Inicialización de Firebase (Configurable vía .env o archivo json)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('🔥 Firebase Admin SDK inicializado correctamente.');
    }
  } else {
    logger.warn('⚠️ FIREBASE_SERVICE_ACCOUNT no encontrada. Las notificaciones Push estarán desactivadas.');
  }
} catch (error) {
  logger.error('❌ Error al inicializar Firebase Admin:', error.message);
}

class NotificationService {
  /**
   * Notificar a un usuario por todos los medios disponibles
   */
  async notify({ receptorId, emisorId, tipo, contenido, referencia = {}, metadata = {} }) {
    const startTime = Date.now();
    try {
      // 1. Guardar en Base de Datos (Persistencia)
      
      // --- Lógica de Idempotencia (TRUE GOD MODE) ---
      const eventId = metadata.eventId || `${tipo}:${emisorId}:${referencia.id || 'system'}`;
      
      // Chequeo preventivo (Read-heavy optimization)
      const existingNotif = await Notification.findOne({ 'metadata.eventId': eventId }).lean();
      if (existingNotif) {
        logger.debug(`[IDEMPOTENCIA] Notificación duplicada detectada (cache/read). eventId: ${eventId}`);
        return existingNotif;
      }

      // --- TTL Dinámico (TRUE GOD MODE) ---
      let ttlDays = 30; // Default
      if (['like_post', 'reaccion'].includes(tipo)) ttlDays = 7;
      if (['sistema', 'seguridad'].includes(tipo)) ttlDays = 90;
      const expiresAt = new Date(Date.now() + (ttlDays * 24 * 60 * 60 * 1000));

      // Enriquecer metadata con el eventId para persistencia
      const enrichedMetadata = { ...metadata, eventId };

      const notification = new Notification({
        receptor: receptorId,
        emisor: emisorId,
        tipo,
        contenido,
        referencia,
        metadata: enrichedMetadata,
        expiresAt
      });

      await notification.save();

      const duration = Date.now() - startTime;
      logger.info(`[METRIC] notif_created | type: ${tipo} | duration: ${duration}ms`);
      
      // Poblar emisor con data mínima para performance V1 PRO PLUS
      await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');

      // 2. Entrega en Tiempo Real (WebSocket)
      this.emitToSocket(receptorId, notification);

      // 3. Entrega Push Inteligente (Smart Push)
      const isCritical = ['sistema', 'mensaje', 'solicitud_amistad', 'solicitud_iglesia', 'solicitud_fundacion', 'solicitud_grupo'].includes(tipo) || tipo.startsWith('solicitud_');
      const isOnline = global.isUserOnline ? global.isUserOnline(receptorId) : false;

      if (!isOnline || isCritical) {
        this.sendPushNotification(receptorId, {
          title: isCritical ? 'Notificación Importante' : 'Nueva notificación',
          body: contenido,
          data: {
            tipo,
            referenciaId: referencia.id?.toString() || '',
            referenciaTipo: referencia.tipo || '',
            notificationId: notification._id.toString()
          }
        }, notification._id).catch(err => logger.error(`Error en flujo Push: ${err.message}`));
      } else {
        logger.debug(`[SMART PUSH] Omitiendo push para ${receptorId} (Online y tipo no crítico: ${tipo})`);
      }

      return notification;
    } catch (error) {
      // Manejar error de duplicidad (Idempotencia estricta en DB)
      if (error.code === 11000 && error.message.includes('metadata.eventId')) {
        logger.debug(`[IDEMPOTENCIA] Colisión detectada en DB (Write-safety). Retornando existente.`);
        return await Notification.findOne({ 'metadata.eventId': metadata.eventId || `${tipo}:${emisorId}:${referencia.id || 'system'}` }).lean();
      }

      logger.error(`❌ [NOTIFICATION SERVICE] Error al notificar: ${error.message}`);
      logger.info(`[METRIC] notif_failed | type: ${tipo} | error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envío por WebSocket utilizando el helper global
   */
  emitToSocket(userId, notification) {
    if (global.emitNotification) {
      global.emitNotification(userId.toString(), notification);
    } else {
      logger.warn(`⚠️ [WS] global.emitNotification no disponible para user: ${userId}`);
    }
  }

  /**
   * Envío de Notificaciones Push vía Firebase
   */
  async sendPushNotification(userId, { title, body, data = {} }, notificationId = null) {
    try {
      // Obtener tokens registrados para el usuario con .lean() para performance
      const tokens = await DeviceToken.find({ userId }).select('token').lean();
      
      if (!tokens || tokens.length === 0) {
        logger.debug(`[FCM] Usuario ${userId} no tiene tokens registrados.`);
        return;
      }

      const registrationTokens = tokens.map(t => t.token);

      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' }, // Compatibilidad móvil
        tokens: registrationTokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      logger.info(`[FCM] Push enviado a ${response.successCount} dispositivos de ${userId}.`);
      logger.info(`[METRIC] push_sent | user: ${userId} | success: ${response.successCount} | failed: ${response.failureCount}`);

      // ✅ Relaxed Delivery Mode V1 PRO SENIOR
      // Si salió el push, consideramos que "llegó" al dispositivo (delivered)
      if (response.successCount > 0 && notificationId) {
        await Notification.findByIdAndUpdate(notificationId, { 
          pushSent: true,
          delivered: true 
        });
      }

      // Limpieza de tokens inválidos (según respuesta de Firebase)
      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((res, idx) => {
          if (!res.success && (res.error?.code === 'messaging/invalid-registration-token' || res.error?.code === 'messaging/registration-token-not-registered')) {
            tokensToRemove.push(registrationTokens[idx]);
          }
        });

        if (tokensToRemove.length > 0) {
          await DeviceToken.deleteMany({ token: { $in: tokensToRemove } });
          logger.info(`[FCM] Eliminados ${tokensToRemove.length} tokens inválidos.`);
        }
      }
    } catch (error) {
       logger.error(`[FCM] Error enviando push: ${error.message}`);
       logger.info(`[METRIC] push_failed | user: ${userId} | error: ${error.message}`);
    }
  }

  /**
   * Registrar un nuevo token de dispositivo
   */
  async registerToken(userId, token, platform = 'web') {
    try {
      await DeviceToken.findOneAndUpdate(
        { token },
        { userId, platform, lastUsedAt: new Date() },
        { upsert: true, new: true }
      );
      logger.info(`[DEVICE] Token registrado para usuario ${userId} [${platform}]`);
    } catch (error) {
      logger.error(`[DEVICE] Error registrando token: ${error.message}`);
    }
  }

  /**
   * Marcar una notificación como entregada (ACK)
   */
  async markAsDelivered(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { delivered: true },
        { new: true }
      );
      if (notification) {
        logger.info(`✅ [ACK] Notificación ${notificationId} marcada como entregada.`);
      }
      return notification;
    } catch (error) {
      logger.error(`❌ [NOTIFICATION SERVICE] Error al marcar entrega: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar una notificación específica
   */
  async deleteNotification(query) {
    try {
      const deleted = await Notification.findOneAndDelete(query);
      if (deleted && global.emitNotification) {
        global.emitNotification(deleted.receptor.toString(), {
          tipo: 'notificacion_eliminada',
          notificacionId: deleted._id
        });
      }
      return deleted;
    } catch (error) {
      logger.error(`❌ [NOTIFICATION SERVICE] Error al eliminar: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new NotificationService();
