const amistadService = require('../services/amistad.service');

class AmistadController {
  /**
   * Enviar solicitud de amistad
   */
  async sendRequest(req, res, next) {
    try {
      const { receptorId } = req.body;

      if (!receptorId) {
        return res.status(400).json({
          ok: false,
          error: 'El ID del receptor es requerido'
        });
      }

      const amistad = await amistadService.sendFriendRequest(
        req.user.id,
        receptorId
      );

      res.status(201).json({
        ok: true,
        message: 'Solicitud de amistad enviada',
        data: amistad
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aceptar solicitud
   */
  async acceptRequest(req, res, next) {
    try {
      const amistad = await amistadService.acceptFriendRequest(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Solicitud aceptada',
        data: amistad
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechazar solicitud
   */
  async rejectRequest(req, res, next) {
    try {
      const result = await amistadService.rejectFriendRequest(
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
   * Obtener lista de amigos
   */
  async getFriends(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await amistadService.getFriends(
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
   * Obtener solicitudes pendientes
   */
  async getPendingRequests(req, res, next) {
    try {
      const solicitudes = await amistadService.getPendingRequests(req.user.id);

      res.json({
        ok: true,
        data: solicitudes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar amistad
   */
  async removeFriend(req, res, next) {
    try {
      const result = await amistadService.removeFriend(
        req.user.id,
        req.params.friendId
      );

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AmistadController();
