const admin = require('firebase-admin');
const Notification = require('../models/Notification.model');
const DeviceToken = require('../models/DeviceToken.model');
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
  async notify({ receptorId, emisorId, tipo, contenido, referencia = {}, metadata = {}, persist = true }) {
    const startTime = Date.now();
    try {
      let notification = null;

      // 1. Guardar en Base de Datos (Solo si persist es true)
      if (persist) {
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

        const notificationObj = new Notification({
          receptor: receptorId,
          emisor: emisorId,
          tipo,
          contenido,
          referencia,
          metadata: enrichedMetadata,
          expiresAt
        });

        notification = await notificationObj.save();

        const duration = Date.now() - startTime;
        logger.info(`[METRIC] notif_created | type: ${tipo} | duration: ${duration}ms`);
        
        // Poblar emisor con data mínima para performance V1 PRO PLUS
        await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');

        // 2. Entrega en Tiempo Real (WebSocket)
        this.emitToSocket(receptorId, notification);
      }

      // 3. Entrega Push Inteligente (Smart Push)
      const isCritical = ['sistema', 'mensaje', 'solicitud_amistad', 'solicitud_iglesia', 'solicitud_fundacion', 'solicitud_grupo'].includes(tipo) || tipo.startsWith('solicitud_');
      const isOnline = global.isUserOnline ? global.isUserOnline(receptorId) : false;

      if (!isOnline || isCritical) {
        this.sendPushNotification(receptorId, {
          title: isCritical ? (tipo === 'mensaje' ? 'Nuevo mensaje' : 'Notificación Importante') : 'Nueva notificación',
          body: contenido,
          data: {
            tipo,
            referenciaId: referencia.id?.toString() || '',
            referenciaTipo: referencia.tipo || '',
            notificationId: notification?._id?.toString() || ''
          }
        }, notification?._id).catch(err => logger.error(`Error en flujo Push: ${err.message}`));
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
      // Obtener tokens registrados para el usuario
      const mongoose = require('mongoose');
      const targetUserId = (typeof userId === 'string') ? new mongoose.Types.ObjectId(userId) : userId;
      
      console.log(`[FCM] Buscando tokens para UID: ${targetUserId} (Type: ${typeof targetUserId})`);
      const tokens = await DeviceToken.find({ userId: targetUserId }).sort({ lastUsedAt: -1 }).lean();
      
      if (!tokens || tokens.length === 0) {
        console.log(`[FCM] Usuario ${userId} no tiene tokens registrados en DB.`);
        return;
      }

      // --- Lógica de Deduplicación y Priorización PWA ---
      const tokenMap = new Map();

      tokens.forEach(t => {
        const key = t.deviceId || `legacy_${t.token}`;
        const existing = tokenMap.get(key);

        // Prioridad: 
        // 1. Si no hay token para este dispositivo, lo agregamos.
        // 2. Si el nuevo token es PWA y el existente no, lo sobreescribimos.
        // 3. Si el existente es más viejo (por lastUsedAt), lo sobreescribimos (si ambos son igual de "PWA").
        if (!existing || (t.isPWA && !existing.isPWA)) {
          tokenMap.set(key, t);
        }
      });

      const registrationTokens = Array.from(tokenMap.values()).map(t => t.token);
      console.log(`[FCM] Tokens finales tras deduplicación: ${registrationTokens.length} (Original: ${tokens.length})`);

      // Determinar link dinámico según tipo
      let targetLink = 'https://degadersocial.com/notificaciones';
      if (data.tipo === 'mensaje') targetLink = 'https://degadersocial.com/mensajes';
      if (data.tipo?.startsWith('solicitud_fundacion')) targetLink = 'https://degadersocial.com/fundacion/solicitudes';
      if (data.tipo?.startsWith('solicitud_amistad')) targetLink = 'https://degadersocial.com/amigos';

      const message = {
        notification: { title, body },
        data: { ...data },
        webpush: {
          notification: {
            title,
            body,
            icon: '/favicon-96x96.png',
            click_action: targetLink
          },
          fcm_options: {
            link: targetLink
          }
        },
        tokens: registrationTokens
      };

      console.log('🚀 [FCM_PAYLOAD] Enviando:', JSON.stringify(message, null, 2));

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`[FCM_RESPONSE] User: ${userId} | Success: ${response.successCount} | Failure: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((res, idx) => {
          if (!res.success) {
            console.error(`[FCM_ERROR] Token idx ${idx}: ${res.error?.code} - ${res.error?.message}`);
          }
        });
      }

      logger.info(`[FCM] Push enviado a ${response.successCount} dispositivos de ${userId}.`);

      // ✅ Relaxed Delivery Mode V1 PRO SENIOR
      // Si salió el push, consideramos que "llegó" al dispositivo (delivered)
      if (response.successCount > 0 && notificationId) {
        await Notification.findByIdAndUpdate(notificationId, { 
          pushSent: true,
          delivered: true 
        });

        // 🧠 FIXED: Sincronizar estado "Delivered" del Chat si el Push fue exitoso (para App Cerrada)
        if (data.tipo === 'mensaje' && data.messageId) {
          try {
            const Message = require('../models/Message.model');
            const msg = await Message.findByIdAndUpdate(
              data.messageId, 
              { estado: 'entregado', fechaEntregado: new Date() }, 
              { new: true }
            );

            // Notificar al Emisor que el mensaje llegó al teléfono del receptor
            if (msg && global.io) {
              global.io.to(`user:${msg.sender}`).emit('message_status_update', {
                messageId: msg._id,
                conversationId: msg.conversationId,
                estado: 'entregado',
                fechaEntregado: msg.fechaEntregado
              });
            }
          } catch (mErr) {
            logger.error(`Error actualizando estado de mensaje entregado por Push: ${mErr.message}`);
          }
        }
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

  /**
   * Notificación estilo WhatsApp para chat de grupo.
   * Crea o actualiza UNA SOLA notificación por grupo por receptor.
   * Siempre muestra el último mensaje — evita spam de N notificaciones.
   */
  async upsertGroupChatNotification({ receptorId, emisorId, grupoId, grupoNombre, contenidoMensaje, mensajeId }) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { 'metadata.eventId': `grupo_chat:${grupoId}:${receptorId}` },
        {
          $set: {
            receptor: receptorId,
            emisor: emisorId,
            tipo: 'mensaje_grupo',
            contenido: `escribió en ${grupoNombre}`,
            read: false,
            delivered: false,
            'referencia.tipo': 'Group',
            'referencia.id': grupoId,
            'metadata.lastMessageContent': (contenidoMensaje || '').substring(0, 100),
            'metadata.grupoNombre': grupoNombre,
            'metadata.mensajeId': mensajeId?.toString(),
            'metadata.updatedAt': new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        { upsert: true, new: true }
      );

      // Poblar emisor para el WebSocket
      await notification.populate('emisor', 'nombres.primero apellidos.primero social.fotoPerfil');

      // Emitir en tiempo real (actualiza la notificación existente en el frontend)
      this.emitToSocket(receptorId, notification);

      // Push inteligente: solo si está offline
      const isOnline = global.isUserOnline ? global.isUserOnline(receptorId) : false;
      if (!isOnline) {
        this.sendPushNotification(receptorId, {
          title: grupoNombre,
          body: contenidoMensaje?.substring(0, 100) || 'Nuevo mensaje',
          data: {
            tipo: 'mensaje_grupo',
            referenciaId: grupoId?.toString(),
            referenciaTipo: 'Group',
            notificationId: notification._id?.toString()
          }
        }, notification._id).catch(err => logger.error(`Error Push grupo: ${err.message}`));
      }

      return notification;
    } catch (error) {
      logger.error(`❌ [UPSERT GROUP CHAT] Error: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();
