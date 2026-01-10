const Notification = require('../models/Notification');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener todas las notificaciones del usuario
 * GET /api/notificaciones
 */
const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Construir query base
    const query = { receptor: req.userId };

    // Si el usuario está suspendido, solo mostrar notificaciones de sistema
    if (req.userSuspended) {
      query.tipo = 'sistema';
      console.log('⚠️ [NOTIF] Usuario suspendido - filtrando solo tipo sistema');
    }

    const notifications = await Notification.find(query)
      .populate('emisor', 'nombres apellidos social.fotoPerfil')
      .populate('referencia.id')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments({ receptor: req.userId });

    // Transformar notificaciones al formato esperado por el frontend
    const transformedNotifications = notifications.map(n => {
      // Construir nombre completo (solo primer nombre y primer apellido)
      let nombreCompleto = 'Usuario';
      if (n.emisor && n.emisor.nombres && n.emisor.apellidos) {
        nombreCompleto = `${n.emisor.nombres.primero} ${n.emisor.apellidos.primero}`.trim();
      }

      // Construir mensaje basado en tipo
      let mensaje = n.contenido;
      if (n.tipo === 'solicitud_amistad') {
        mensaje = `${nombreCompleto} te envió una solicitud de amistad`;
      } else if (n.tipo === 'amistad_aceptada') {
        mensaje = `${nombreCompleto} aceptó tu solicitud de amistad`;
      } else if (n.tipo === 'amistad_eliminada') {
        mensaje = `${nombreCompleto} eliminó la amistad`;
      } else if (n.tipo === 'solicitud_cancelada') {
        mensaje = `${nombreCompleto} canceló la solicitud de amistad`;
      } else if (n.tipo === 'solicitud_grupo') {
        // Para solicitudes de grupo, agregar el nombre del usuario y del grupo
        const nombreGrupo = n.referencia?.id?.nombre || 'un grupo';
        mensaje = `${nombreCompleto} solicitó unirse al grupo "${nombreGrupo}"`;
      } else if (n.tipo === 'promocion_admin_grupo') {
        // Para promoción a admin, incluir nombre del grupo
        const nombreGrupo = n.referencia?.id?.nombre || 'el grupo';
        mensaje = `${nombreCompleto} ${n.contenido} "${nombreGrupo}"`;
      } else if (n.tipo === 'solicitud_grupo_aprobada' || n.tipo === 'solicitud_grupo_rechazada') {
        // Para respuestas a solicitudes de grupo, el mensaje ya está completo
        mensaje = n.contenido;
      } else if (n.tipo === 'solicitud_iglesia' || n.tipo === 'solicitud_iglesia_aprobada' || n.tipo === 'solicitud_iglesia_rechazada') {
        // Para notificaciones de iglesia, usar el contenido tal cual
        mensaje = n.contenido;
      } else if (n.tipo === 'solicitud_fundacion' || n.tipo === 'solicitud_fundacion_aprobada' || n.tipo === 'solicitud_fundacion_rechazada') {
        // Para notificaciones de fundación, usar el contenido tal cual
        mensaje = n.contenido;
      } else if (n.tipo === 'nuevo_anuncio') {
        // Notificación de nuevo anuncio
        const nombreAnuncio = n.referencia?.id?.nombreCliente || 'un anuncio';
        mensaje = `${nombreCompleto} ${n.contenido} "${nombreAnuncio}"`;
      } else if (n.contenido) {
        mensaje = `${nombreCompleto} ${n.contenido}`;
      }

      return {
        _id: n._id,
        tipo: n.tipo === 'solicitud_amistad' || n.tipo === 'amistad_aceptada' ? 'amistad' : n.tipo,
        mensaje: mensaje,
        contenido: n.contenido, // Agregar contenido original
        leido: n.leida,
        fechaCreacion: n.createdAt,
        createdAt: n.createdAt, // Agregar createdAt para compatibilidad
        // Incluir objeto emisor completo para notificaciones de iglesia
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
        // Incluir referencia y metadata para notificaciones de iglesia
        referencia: n.referencia,
        metadata: n.metadata
      };
    });

    res.json({
      success: true,
      data: {
        notifications: transformedNotifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
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
    const notifications = await Notification.find({
      receptor: req.userId,
      leida: false
    })
      .populate('emisor', 'nombres apellidos social.fotoPerfil')
      .populate('referencia.id')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transformar notificaciones al formato esperado por el frontend
    const transformedNotifications = notifications.map(n => {
      // Construir nombre completo (solo primer nombre y primer apellido)
      let nombreCompleto = 'Usuario';
      if (n.emisor && n.emisor.nombres && n.emisor.apellidos) {
        nombreCompleto = `${n.emisor.nombres.primero} ${n.emisor.apellidos.primero}`.trim();
      }

      // Construir mensaje basado en tipo
      let mensaje = n.contenido;
      if (n.tipo === 'solicitud_amistad') {
        mensaje = `${nombreCompleto} te envió una solicitud de amistad`;
      } else if (n.tipo === 'amistad_aceptada') {
        mensaje = `${nombreCompleto} aceptó tu solicitud de amistad`;
      } else if (n.tipo === 'amistad_eliminada') {
        mensaje = `${nombreCompleto} eliminó la amistad`;
      } else if (n.tipo === 'solicitud_cancelada') {
        mensaje = `${nombreCompleto} canceló la solicitud de amistad`;
      } else if (n.tipo === 'solicitud_grupo') {
        // Para solicitudes de grupo, agregar el nombre del usuario y del grupo
        const nombreGrupo = n.referencia?.id?.nombre || 'un grupo';
        mensaje = `${nombreCompleto} solicitó unirse al grupo "${nombreGrupo}"`;
      } else if (n.tipo === 'solicitud_grupo_aprobada' || n.tipo === 'solicitud_grupo_rechazada') {
        // Para respuestas a solicitudes de grupo, el mensaje ya está completo
        mensaje = n.contenido;
      } else if (n.tipo === 'solicitud_iglesia' || n.tipo === 'solicitud_iglesia_aprobada' || n.tipo === 'solicitud_iglesia_rechazada') {
        // Para notificaciones de iglesia, usar el contenido tal cual
        mensaje = n.contenido;
      } else if (n.tipo === 'solicitud_fundacion' || n.tipo === 'solicitud_fundacion_aprobada' || n.tipo === 'solicitud_fundacion_rechazada') {
        // Para notificaciones de fundación, usar el contenido tal cual
        mensaje = n.contenido;
      } else if (n.contenido) {
        mensaje = `${nombreCompleto} ${n.contenido}`;
      }

      return {
        _id: n._id,
        tipo: n.tipo === 'solicitud_amistad' || n.tipo === 'amistad_aceptada' ? 'amistad' : n.tipo,
        mensaje: mensaje,
        contenido: n.contenido, // Agregar contenido original
        leido: n.leida,
        fechaCreacion: n.createdAt,
        createdAt: n.createdAt, // Agregar createdAt para compatibilidad
        // Incluir objeto emisor completo para notificaciones de iglesia
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
        // Incluir referencia y metadata para notificaciones de iglesia
        referencia: n.referencia,
        metadata: n.metadata
      };
    });

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
      .populate('referencia.id');

    if (!notification) {
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }

    // Verificar que la notificación pertenece al usuario
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para ver esta notificación'));
    }

    // Si el usuario está suspendido, solo permitir notificaciones de sistema
    if (req.userSuspended && notification.tipo !== 'sistema') {
      console.log('❌ [NOTIF] Usuario suspendido intentando ver notificación no-sistema');
      return res.status(403).json(formatErrorResponse('Solo puedes ver notificaciones del sistema mientras estés suspendido'));
    }

    res.json(formatSuccessResponse('Notificación obtenida', notification));
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
    const count = await Notification.countDocuments({
      receptor: req.userId,
      leida: false
    });

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
      return res.json(formatSuccessResponse('Notificación procesada', { leida: true }));
    }

    // Verificar que la notificación pertenece al usuario
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para modificar esta notificación'));
    }

    // Solo actualizar si no está leída
    if (!notification.leida) {
      notification.leida = true;
      notification.fechaLeida = new Date();
      await notification.save();
    }

    res.json(formatSuccessResponse('Notificación marcada como leída', notification));
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
      { receptor: req.userId, leida: false },
      {
        $set: {
          leida: true,
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

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }

    // Verificar que la notificación pertenece al usuario
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar esta notificación'));
    }

    await Notification.findByIdAndDelete(id);

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
      leida: true
    });

    res.json(formatSuccessResponse('Notificaciones leídas eliminadas exitosamente'));
  } catch (error) {
    console.error('Error al limpiar notificaciones:', error);
    res.status(500).json(formatErrorResponse('Error al limpiar notificaciones', [error.message]));
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
  clearReadNotifications
};
