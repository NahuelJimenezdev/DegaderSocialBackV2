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

    const notifications = await Notification.find({ receptor: req.userId })
      .populate('emisor', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments({ receptor: req.userId });

    // Transformar notificaciones al formato esperado por el frontend
    const transformedNotifications = notifications.map(n => {
      // Construir mensaje basado en tipo
      let mensaje = n.contenido;
      if (n.emisor) {
        const nombreCompleto = `${n.emisor.nombre} ${n.emisor.apellido}`;
        if (n.tipo === 'solicitud_amistad') {
          mensaje = `${nombreCompleto} te envió una solicitud de amistad`;
        } else if (n.tipo === 'amistad_aceptada') {
          mensaje = `${nombreCompleto} aceptó tu solicitud de amistad`;
        } else if (n.contenido) {
          mensaje = `${nombreCompleto} ${n.contenido}`;
        }
      }

      return {
        _id: n._id,
        tipo: n.tipo === 'solicitud_amistad' || n.tipo === 'amistad_aceptada' ? 'amistad' : n.tipo,
        mensaje: mensaje,
        leido: n.leida,
        fechaCreacion: n.createdAt,
        remitenteId: n.emisor ? {
          _id: n.emisor._id,
          nombre: n.emisor.nombre,
          apellido: n.emisor.apellido,
          avatar: n.emisor.avatar
        } : null,
        datos: {
          nombre: n.emisor ? `${n.emisor.nombre} ${n.emisor.apellido}` : '',
          avatar: n.emisor?.avatar,
          fromUserId: n.emisor?._id
        }
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
      .populate('emisor', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transformar notificaciones al formato esperado por el frontend
    const transformedNotifications = notifications.map(n => {
      // Construir mensaje basado en tipo
      let mensaje = n.contenido;
      if (n.emisor) {
        const nombreCompleto = `${n.emisor.nombre} ${n.emisor.apellido}`;
        if (n.tipo === 'solicitud_amistad') {
          mensaje = `${nombreCompleto} te envió una solicitud de amistad`;
        } else if (n.tipo === 'amistad_aceptada') {
          mensaje = `${nombreCompleto} aceptó tu solicitud de amistad`;
        } else if (n.contenido) {
          mensaje = `${nombreCompleto} ${n.contenido}`;
        }
      }

      return {
        _id: n._id,
        tipo: n.tipo === 'solicitud_amistad' || n.tipo === 'amistad_aceptada' ? 'amistad' : n.tipo,
        mensaje: mensaje,
        leido: n.leida,
        fechaCreacion: n.createdAt,
        remitenteId: n.emisor ? {
          _id: n.emisor._id,
          nombre: n.emisor.nombre,
          apellido: n.emisor.apellido,
          avatar: n.emisor.avatar
        } : null,
        datos: {
          nombre: n.emisor ? `${n.emisor.nombre} ${n.emisor.apellido}` : '',
          avatar: n.emisor?.avatar,
          fromUserId: n.emisor?._id
        }
      };
    });

    res.json(formatSuccessResponse('Notificaciones no leídas obtenidas', transformedNotifications));
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas:', error);
    res.status(500).json(formatErrorResponse('Error al obtener notificaciones no leídas', [error.message]));
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
      return res.status(404).json(formatErrorResponse('Notificación no encontrada'));
    }

    // Verificar que la notificación pertenece al usuario
    if (!notification.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para modificar esta notificación'));
    }

    if (!notification.leida) {
      notification.leida = true;
      notification.fechaLeida = new Date();
      await notification.save();
    }

    res.json(formatSuccessResponse('Notificación marcada como leída', notification));
  } catch (error) {
    console.error('Error al marcar notificación:', error);
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
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications
};
