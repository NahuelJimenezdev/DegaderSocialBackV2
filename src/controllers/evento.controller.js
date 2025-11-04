const eventoService = require('../services/evento.service');

class EventoController {
  /**
   * Crear evento
   */
  async create(req, res, next) {
    try {
      const evento = await eventoService.createEvent(req.body, req.user.id);

      res.status(201).json({
        ok: true,
        message: 'Evento creado exitosamente',
        data: evento
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los eventos
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, categoria } = req.query;
      const filters = {};

      if (categoria) filters.categoria = categoria;

      const result = await eventoService.getAllEvents(
        parseInt(page),
        parseInt(limit),
        filters
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
   * Obtener evento por ID
   */
  async getById(req, res, next) {
    try {
      const evento = await eventoService.getEventById(req.params.id);

      res.json({
        ok: true,
        data: evento
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registrarse en evento
   */
  async register(req, res, next) {
    try {
      const evento = await eventoService.registerToEvent(
        req.params.id,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Registrado exitosamente en el evento',
        data: evento
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancelar registro
   */
  async unregister(req, res, next) {
    try {
      const result = await eventoService.unregisterFromEvent(
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
   * Actualizar evento
   */
  async update(req, res, next) {
    try {
      const evento = await eventoService.updateEvent(
        req.params.id,
        req.user.id,
        req.body
      );

      res.json({
        ok: true,
        message: 'Evento actualizado',
        data: evento
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar evento
   */
  async delete(req, res, next) {
    try {
      const result = await eventoService.deleteEvent(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener eventos próximos
   */
  async getUpcoming(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const eventos = await eventoService.getUpcomingEvents(parseInt(limit));

      res.json({
        ok: true,
        data: eventos
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventoController();
