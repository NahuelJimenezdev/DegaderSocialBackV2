const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

// ─────────────────────────────────────────────────────────
// TRANSFORMADOR ÚNICO (Fase 1.1 — Elimina duplicación DRY)
// ─────────────────────────────────────────────────────────

/**
 * Transforma un documento lean de Notification al formato que consume el frontend.
 * ÚNICA fuente de verdad para la estructura de respuesta.
 * 
 * Campos de lectura unificados:
 *   - read:  campo canónico (valor real de DB)
 *   - leida: alias compatibilidad (FundacionNotificationCard, IglesiaNotificationCard, MeetingNotificationCard)
 *   - leido: alias compatibilidad (useNotifications, NotificationCard, NotificationsPage)
 */
const transformNotification = (n) => {
  // Construir nombre completo (solo primer nombre y primer apellido)
  let nombreCompleto = 'Usuario';
  if (n.emisor && n.emisor.nombres && n.emisor.apellidos) {
    nombreCompleto = `${n.emisor.nombres.primero} ${n.emisor.apellidos.primero}`.trim();
  }

  // Construir mensaje basado en tipo
  let mensaje = n.contenido;

  switch (n.tipo) {
    case 'solicitud_amistad':
      mensaje = `${nombreCompleto} te envió una solicitud de amistad`;
      break;
    case 'amistad_aceptada':
      mensaje = `${nombreCompleto} aceptó tu solicitud de amistad`;
      break;
    case 'amistad_eliminada':
      mensaje = `${nombreCompleto} eliminó la amistad`;
      break;
    case 'solicitud_cancelada':
      mensaje = `${nombreCompleto} canceló la solicitud de amistad`;
      break;
    case 'solicitud_grupo': {
      const nombreGrupo = n.referencia?.id?.nombre || 'un grupo';
      mensaje = `${nombreCompleto} solicitó unirse al grupo "${nombreGrupo}"`;
      break;
    }
    case 'promocion_admin_grupo': {
      const nombreGrupo = n.referencia?.id?.nombre || 'el grupo';
      mensaje = `${nombreCompleto} ${n.contenido} "${nombreGrupo}"`;
      break;
    }
    case 'solicitud_grupo_aprobada':
    case 'solicitud_grupo_rechazada':
      mensaje = n.contenido;
      break;
    case 'nueva_publicacion_grupo': {
      const nombreGrupo = n.referencia?.id?.nombre || n.metadata?.grupoNombre || 'un grupo';
      mensaje = `${nombreCompleto} publicó en el grupo "${nombreGrupo}"`;
      break;
    }
    case 'nuevo_miembro_grupo':
    case 'miembro_agregado_grupo': {
      const nombreGrupo = n.referencia?.id?.nombre || n.metadata?.grupoNombre || 'un grupo';
      mensaje = `${nombreCompleto} se unió al grupo "${nombreGrupo}"`;
      break;
    }
    case 'mensaje_grupo': {
      const nombreGrupo = n.referencia?.id?.nombre || n.metadata?.grupoNombre || 'un grupo';
      const preview = n.metadata?.lastMessageContent ? `: "${n.metadata.lastMessageContent}"` : '';
      mensaje = `${nombreCompleto} escribió en ${nombreGrupo}${preview}`;
      break;
    }
    case 'solicitud_iglesia':
    case 'solicitud_iglesia_aprobada':
    case 'solicitud_iglesia_rechazada':
      mensaje = n.contenido;
      break;
    case 'solicitud_fundacion':
    case 'solicitud_fundacion_aprobada':
    case 'solicitud_fundacion_rechazada':
      mensaje = n.contenido;
      break;
    case 'nuevo_anuncio': {
      const nombreAnuncio = n.referencia?.id?.nombreCliente || 'un anuncio';
      mensaje = `${nombreCompleto} ${n.contenido} "${nombreAnuncio}"`;
      break;
    }
    default:
      if (n.contenido) {
        mensaje = `${nombreCompleto} ${n.contenido}`;
      }
      break;
  }

  // Estado de lectura unificado — read es la fuente de verdad
  const isRead = n.read || false;

  return {
    _id: n._id,
    tipo: n.tipo === 'solicitud_amistad' || n.tipo === 'amistad_aceptada' ? 'amistad' : n.tipo,
    tipoOriginal: n.tipo,
    mensaje: mensaje,
    contenido: n.contenido, // Contenido original
    // Tres aliases del mismo valor — compatibilidad frontend
    read: isRead,
    leida: isRead,
    leido: isRead,
    accionada: n.accionada || false,
    estadoAccion: n.estadoAccion || 'pendiente',
    fechaCreacion: n.createdAt,
    createdAt: n.createdAt,
    // Emisor completo para notificaciones de iglesia/fundación
    emisor: n.emisor ? {
      _id: n.emisor._id,
      nombres: n.emisor.nombres,
      apellidos: n.emisor.apellidos,
      social: n.emisor.social
    } : null,
    remitenteId: n.emisor ? {
      _id: n.emisor._id,
      nombre: n.emisor.nombres?.primero,
      apellido: n.emisor.apellidos?.primero,
      avatar: n.emisor.social?.fotoPerfil
    } : null,
    datos: {
      nombre: nombreCompleto,
      avatar: n.emisor?.social?.fotoPerfil,
      fromUserId: n.emisor?._id
    },
    // Referencia y metadata
    referencia: n.referencia,
    metadata: n.metadata
  };
};

// ─────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────

/**
 * Obtener todas las notificaciones del usuario
 * GET /api/notificaciones
 */
const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const parsedLimit = parseInt(limit) || 20;
    const parsedPage = parseInt(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    // Construir query base — reutilizable para find Y countDocuments
    const query = { receptor: req.userId };

    // Si el usuario está suspendido, solo mostrar notificaciones de sistema
    if (req.userSuspended) {
      query.tipo = 'sistema';
      console.log('⚠️ [NOTIF] Usuario suspendido - filtrando solo tipo sistema');
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('emisor', 'nombres apellidos social.fotoPerfil')
        .populate('referencia.id', 'nombre titulo')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .lean(),
      Notification.countDocuments(query)
    ]);

    const transformedNotifications = notifications.map(transformNotification);

    res.json({
      success: true,
      data: {
        notifications: transformedNotifications,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json(formatErrorResponse('Error al obtener notificaciones', [error.message]));
  }
};

/**
 * Obtener notificaciones no leídas
 * GET /api/notificaciones/unread
 */
const getUnreadNotifications = async (req, res) => {
  try {
    const query = { receptor: req.userId, read: false };
    if (req.userSuspended) {
      query.tipo = 'sistema';
    }

    const notifications = await Notification.find(query)
      .populate('emisor', 'nombres apellidos social.fotoPerfil')
      .populate('referencia.id', 'nombre titulo')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const transformedNotifications = notifications.map(transformNotification);

    res.json(formatSuccessResponse('Notificaciones no leídas obtenidas', transformedNotifications));
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas:', error);
    res.status(500).json(formatErrorResponse('Error al obtener notificaciones no leídas', [error.message]));
  }
};

/**
 * Obtener una notificación por ID
 * GET /api/notificaciones/:id
 */
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const notification = await Notification.findById(id)
      .populate('emisor', 'username nombres apellidos social.fotoPerfil')
      .populate('referencia.id')
      .lean();

    if (!notification) {
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }

    // Verificar que la notificación pertenece al usuario
    if (notification.receptor.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para ver esta notificación'));
    }

    // Si el usuario está suspendido, solo permitir notificaciones de sistema
    if (req.userSuspended && notification.tipo !== 'sistema') {
      console.log('❌ [NOTIF] Usuario suspendido intentando ver notificación no-sistema');
      return res.status(403).json(formatErrorResponse('Solo puedes ver notificaciones del sistema mientras estés suspendido'));
    }

    res.json(formatSuccessResponse('Notificación obtenida', transformNotification(notification)));
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json(formatErrorResponse('Error al obtener notificación', [error.message]));
  }
};

/**
 * Obtener conteo de notificaciones no leídas
 * GET /api/notificaciones/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const query = { receptor: req.userId, read: false };
    if (req.userSuspended) {
      query.tipo = 'sistema';
    }

    const count = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error al contar notificaciones:', error);
    res.status(500).json(formatErrorResponse('Error al contar notificaciones', [error.message]));
  }
};

/**
 * Marcar notificación como leída
 * PUT /api/notificaciones/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      // Si la notificación no existe, devolver éxito (ya fue eliminada)
      console.log(`Notificación ${id} no encontrada - probablemente ya fue eliminada`);
      return res.json(formatSuccessResponse('Notificación procesada', { read: true, leida: true }));
    }

    // Verificar que la notificación pertenece al usuario
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para modificar esta notificación'));
    }

    // Solo actualizar si no está leída (idempotente)
    if (!notification.read) {
      notification.read = true;
      notification.fechaLeida = new Date();
      await notification.save();
    }

    res.json(formatSuccessResponse('Notificación marcada como leída', {
      _id: notification._id,
      read: true,
      leido: true
    }));
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    // Si es un error de cast (ID inválido de MongoDB), devolver 400
    if (error.name === 'CastError') {
      return res.status(400).json(formatErrorResponse('ID de notificación inválido'));
    }
    res.status(500).json(formatErrorResponse('Error al marcar notificación', [error.message]));
  }
};

/**
 * Marcar todas las notificaciones como leídas
 * PUT /api/notificaciones/mark-all-read
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { receptor: req.userId, read: false },
      {
        $set: {
          read: true,
          fechaLeida: new Date()
        }
      }
    );

    res.json(formatSuccessResponse('Todas las notificaciones marcadas como leídas'));
  } catch (error) {
    console.error('Error al marcar todas las notificaciones:', error);
    res.status(500).json(formatErrorResponse('Error al marcar notificaciones', [error.message]));
  }
};

/**
 * Eliminar notificación
 * DELETE /api/notificaciones/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      receptor: req.userId
    });

    if (!deleted) {
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }

    res.json(formatSuccessResponse('Notificación eliminada exitosamente'));
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar notificación', [error.message]));
  }
};

/**
 * Eliminar todas las notificaciones leídas
 * DELETE /api/notificaciones/clear-read
 */
const clearReadNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      receptor: req.userId,
      read: true
    });
    res.json(formatSuccessResponse('Notificaciones leídas eliminadas exitosamente'));
  } catch (error) {
    console.error('Error al limpiar notificaciones:', error);
    res.status(500).json(formatErrorResponse('Error al limpiar notificaciones', [error.message]));
  }
};

/**
 * Registrar token de dispositivo para Push Notifications
 * POST /api/notificaciones/register-token
 */
const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform = 'web', deviceId, isPWA = false } = req.body;

    if (!token) {
      return res.status(400).json(formatErrorResponse('Token es requerido'));
    }

    const DeviceToken = require('../models/DeviceToken.model');

    // Lógica de Deduplicación: 
    // Si viene deviceId, buscamos por {userId, deviceId} para actualizar el token de ese dispositivo físico.
    // Si no viene (clientes viejos), usamos el token como clave.
    const query = deviceId ? { userId: req.userId, deviceId } : { token };
    
    await DeviceToken.findOneAndUpdate(
      query,
      { 
        userId: req.userId, 
        token,
        deviceId,
        isPWA,
        platform, 
        lastUsedAt: new Date() 
      },
      { upsert: true, new: true }
    );

    console.log(`[PUSH_TOKEN] Token registrado/actualizado. User: ${req.userId} | PWA: ${isPWA} | Platform: ${platform} | Dev: ${deviceId?.substring(0, 8) || 'legacy'}...`);

    res.json(formatSuccessResponse('Token registrado exitosamente'));
  } catch (error) {
    console.error('❌ Error al registrar token:', error);
    res.status(500).json(formatErrorResponse('Error al registrar token', [error.message]));
  }
};

/**
 * Marcar una notificación como entregada
 * PUT /api/notificaciones/:id/delivered
 */
const markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar existencia y propiedad ANTES de delegar
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para modificar esta notificación'));
    }

    await notificationService.markAsDelivered(id);

    res.json(formatSuccessResponse('Notificación marcada como entregada'));
  } catch (error) {
    console.error('❌ Error al marcar entrega:', error);
    res.status(500).json(formatErrorResponse('Error al marcar entrega', [error.message]));
  }
};

module.exports = {
  getAllNotifications,
  getUnreadNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  markAsDelivered,
  registerDeviceToken
};
