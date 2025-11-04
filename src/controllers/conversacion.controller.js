const conversacionService = require('../services/conversacion.service');

class ConversacionController {
  /**
   * Obtener o crear conversación
   */
  async getOrCreate(req, res, next) {
    try {
      const { userId } = req.params;

      const conversacion = await conversacionService.getOrCreateConversation(
        req.user.id,
        userId
      );

      res.json({
        ok: true,
        data: conversacion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(req, res, next) {
    try {
      const { contenido } = req.body;

      if (!contenido) {
        return res.status(400).json({
          ok: false,
          error: 'El contenido del mensaje es requerido'
        });
      }

      const conversacion = await conversacionService.sendMessage(
        req.params.id,
        req.user.id,
        contenido
      );

      res.json({
        ok: true,
        message: 'Mensaje enviado',
        data: conversacion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todas las conversaciones del usuario
   */
  async getUserConversations(req, res, next) {
    try {
      const conversaciones = await conversacionService.getUserConversations(
        req.user.id
      );

      res.json({
        ok: true,
        data: conversaciones
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener conversación por ID
   */
  async getById(req, res, next) {
    try {
      const conversacion = await conversacionService.getConversationById(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        data: conversacion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(req, res, next) {
    try {
      const conversacion = await conversacionService.markAsRead(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Mensajes marcados como leídos',
        data: conversacion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener contador de mensajes no leídos
   */
  async getUnreadCount(req, res, next) {
    try {
      const result = await conversacionService.getUnreadCount(req.user.id);

      res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversacionController();
