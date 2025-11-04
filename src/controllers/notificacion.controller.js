const notificacionService = require('../services/notificacion.service');

class NotificacionController {
  /**
   * Obtener todas las notificaciones del usuario
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await notificacionService.getUserNotifications(
        req.user.id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener notificaciones no leídas
   */
  async getUnread(req, res, next) {
    try {
      const notificaciones = await notificacionService.getUnreadNotifications(
        req.user.id
      );

      res.json({
        ok: true,
        data: notificaciones
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marcar como leída
   */
  async markAsRead(req, res, next) {
    try {
      const notificacion = await notificacionService.markAsRead(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Notificación marcada como leída',
        data: notificacion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificacionService.markAllAsRead(req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar notificación
   */
  async delete(req, res, next) {
    try {
      const result = await notificacionService.deleteNotification(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener contador de no leídas
   */
  async getUnreadCount(req, res, next) {
    try {
      const result = await notificacionService.getUnreadCount(req.user.id);

      res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificacionController();
