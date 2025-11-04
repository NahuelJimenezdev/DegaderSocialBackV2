const Amistad = require('../models/Amistad');
const Notificacion = require('../models/Notificacion');

class AmistadService {
  /**
   * Enviar solicitud de amistad
   */
  async sendFriendRequest(solicitanteId, receptorId) {
    if (solicitanteId === receptorId) {
      throw new Error('No puedes enviarte una solicitud a ti mismo');
    }

    // Verificar si ya existe una solicitud
    const existingRequest = await Amistad.findOne({
      $or: [
        { solicitante: solicitanteId, receptor: receptorId },
        { solicitante: receptorId, receptor: solicitanteId }
      ]
    });

    if (existingRequest) {
      throw new Error('Ya existe una solicitud de amistad');
    }

    const amistad = new Amistad({
      solicitante: solicitanteId,
      receptor: receptorId,
      estado: 'pendiente'
    });

    await amistad.save();

    // Crear notificación
    await new Notificacion({
      destinatario: receptorId,
      emisor: solicitanteId,
      tipo: 'amistad_solicitud',
      contenido: 'Te ha enviado una solicitud de amistad',
      referencia: {
        tipo: 'Amistad',
        id: amistad._id
      }
    }).save();

    return amistad;
  }

  /**
   * Aceptar solicitud de amistad
   */
  async acceptFriendRequest(requestId, userId) {
    const amistad = await Amistad.findById(requestId);

    if (!amistad) {
      throw new Error('Solicitud no encontrada');
    }

    if (amistad.receptor.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para aceptar esta solicitud');
    }

    amistad.estado = 'aceptada';
    amistad.fechaAceptacion = new Date();
    await amistad.save();

    // Crear notificación
    await new Notificacion({
      destinatario: amistad.solicitante,
      emisor: userId,
      tipo: 'amistad_aceptada',
      contenido: 'Ha aceptado tu solicitud de amistad',
      referencia: {
        tipo: 'Amistad',
        id: amistad._id
      }
    }).save();

    return amistad;
  }

  /**
   * Rechazar solicitud de amistad
   */
  async rejectFriendRequest(requestId, userId) {
    const amistad = await Amistad.findById(requestId);

    if (!amistad) {
      throw new Error('Solicitud no encontrada');
    }

    if (amistad.receptor.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para rechazar esta solicitud');
    }

    amistad.estado = 'rechazada';
    await amistad.save();

    return { message: 'Solicitud rechazada' };
  }

  /**
   * Obtener lista de amigos
   */
  async getFriends(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const amistades = await Amistad.find({
      $or: [
        { solicitante: userId, estado: 'aceptada' },
        { receptor: userId, estado: 'aceptada' }
      ]
    })
      .populate('solicitante', 'nombre apellido avatar')
      .populate('receptor', 'nombre apellido avatar')
      .limit(limit)
      .skip(skip);

    const total = await Amistad.countDocuments({
      $or: [
        { solicitante: userId, estado: 'aceptada' },
        { receptor: userId, estado: 'aceptada' }
      ]
    });

    // Formatear respuesta
    const friends = amistades.map(amistad => {
      const friend = amistad.solicitante._id.toString() === userId.toString()
        ? amistad.receptor
        : amistad.solicitante;

      return {
        ...friend.toObject(),
        fechaAmistad: amistad.fechaAceptacion
      };
    });

    return {
      friends,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener solicitudes pendientes
   */
  async getPendingRequests(userId) {
    const solicitudes = await Amistad.find({
      receptor: userId,
      estado: 'pendiente'
    })
      .populate('solicitante', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    return solicitudes;
  }

  /**
   * Eliminar amistad
   */
  async removeFriend(userId, friendId) {
    const amistad = await Amistad.findOne({
      $or: [
        { solicitante: userId, receptor: friendId },
        { solicitante: friendId, receptor: userId }
      ],
      estado: 'aceptada'
    });

    if (!amistad) {
      throw new Error('Amistad no encontrada');
    }

    await amistad.deleteOne();

    return { message: 'Amistad eliminada' };
  }
}

module.exports = new AmistadService();
