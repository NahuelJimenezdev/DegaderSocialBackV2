const Notificacion = require('../models/Notificacion');
const { emitToUser } = require('../config/socket');

class NotificacionService {
  /**
   * Crear notificación
   */
  async createNotification(notificationData) {
    const notificacion = new Notificacion(notificationData);
    await notificacion.save();
    await notificacion.populate('emisor', 'nombre apellido avatar');

    // Emitir notificación en tiempo real
    try {
      emitToUser(notificacion.destinatario, 'notification:new', notificacion);
    } catch (error) {
      console.error('Error emitiendo notificación en tiempo real:', error);
    }

    return notificacion;
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const notificaciones = await Notificacion.find({ destinatario: userId })
      .populate('emisor', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Notificacion.countDocuments({ destinatario: userId });

    return {
      notificaciones,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener notificaciones no leídas
   */
  async getUnreadNotifications(userId) {
    const notificaciones = await Notificacion.find({
      destinatario: userId,
      leida: false
    })
      .populate('emisor', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    return notificaciones;
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId, userId) {
    const notificacion = await Notificacion.findById(notificationId);

    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    if (notificacion.destinatario.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para actualizar esta notificación');
    }

    notificacion.leida = true;
    notificacion.fechaLectura = new Date();
    await notificacion.save();

    return notificacion;
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(userId) {
    await Notificacion.updateMany(
      { destinatario: userId, leida: false },
      {
        leida: true,
        fechaLectura: new Date()
      }
    );

    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(notificationId, userId) {
    const notificacion = await Notificacion.findById(notificationId);

    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    if (notificacion.destinatario.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para eliminar esta notificación');
    }

    await notificacion.deleteOne();

    return { message: 'Notificación eliminada' };
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getUnreadCount(userId) {
    const count = await Notificacion.countDocuments({
      destinatario: userId,
      leida: false
    });

    return { unreadCount: count };
  }
}

module.exports = new NotificacionService();
