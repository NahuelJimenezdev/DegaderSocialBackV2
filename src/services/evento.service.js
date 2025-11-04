const Evento = require('../models/Evento');

class EventoService {
  /**
   * Crear evento
   */
  async createEvent(eventData, creadorId) {
    const evento = new Evento({
      ...eventData,
      creador: creadorId
    });

    await evento.save();
    await evento.populate('creador', 'nombre apellido avatar');

    return evento;
  }

  /**
   * Obtener todos los eventos
   */
  async getAllEvents(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;

    const query = { activo: true, ...filters };

    const eventos = await Evento.find(query)
      .populate('creador', 'nombre apellido avatar')
      .sort({ fechaInicio: 1 })
      .limit(limit)
      .skip(skip);

    const total = await Evento.countDocuments(query);

    return {
      eventos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener evento por ID
   */
  async getEventById(eventoId) {
    const evento = await Evento.findById(eventoId)
      .populate('creador', 'nombre apellido avatar')
      .populate('participantes.usuario', 'nombre apellido avatar');

    if (!evento || !evento.activo) {
      throw new Error('Evento no encontrado');
    }

    return evento;
  }

  /**
   * Registrarse en un evento
   */
  async registerToEvent(eventoId, userId) {
    const evento = await Evento.findById(eventoId);

    if (!evento || !evento.activo) {
      throw new Error('Evento no encontrado');
    }

    // Verificar capacidad
    if (evento.capacidadMaxima && evento.participantes.length >= evento.capacidadMaxima) {
      throw new Error('El evento ha alcanzado su capacidad máxima');
    }

    // Verificar si ya está registrado
    const yaRegistrado = evento.participantes.some(
      p => p.usuario.toString() === userId.toString()
    );

    if (yaRegistrado) {
      throw new Error('Ya estás registrado en este evento');
    }

    evento.participantes.push({
      usuario: userId,
      estado: 'confirmado',
      fechaRegistro: new Date()
    });

    await evento.save();
    await evento.populate('participantes.usuario', 'nombre apellido avatar');

    return evento;
  }

  /**
   * Cancelar registro en evento
   */
  async unregisterFromEvent(eventoId, userId) {
    const evento = await Evento.findById(eventoId);

    if (!evento) {
      throw new Error('Evento no encontrado');
    }

    evento.participantes = evento.participantes.filter(
      p => p.usuario.toString() !== userId.toString()
    );

    await evento.save();

    return { message: 'Registro cancelado exitosamente' };
  }

  /**
   * Actualizar evento
   */
  async updateEvent(eventoId, userId, updateData) {
    const evento = await Evento.findById(eventoId);

    if (!evento) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario sea el creador
    if (evento.creador.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para actualizar este evento');
    }

    Object.assign(evento, updateData);
    await evento.save();

    return evento;
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(eventoId, userId) {
    const evento = await Evento.findById(eventoId);

    if (!evento) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario sea el creador
    if (evento.creador.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para eliminar este evento');
    }

    evento.activo = false;
    await evento.save();

    return { message: 'Evento eliminado exitosamente' };
  }

  /**
   * Obtener eventos próximos
   */
  async getUpcomingEvents(limit = 10) {
    const eventos = await Evento.find({
      activo: true,
      fechaInicio: { $gte: new Date() }
    })
      .populate('creador', 'nombre apellido avatar')
      .sort({ fechaInicio: 1 })
      .limit(limit);

    return eventos;
  }
}

module.exports = new EventoService();
