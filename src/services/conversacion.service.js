const Conversacion = require('../models/Conversacion');
const { emitToConversation } = require('../config/socket');

class ConversacionService {
  /**
   * Crear o obtener conversación entre dos usuarios
   */
  async getOrCreateConversation(user1Id, user2Id) {
    // Buscar conversación existente
    let conversacion = await Conversacion.findOne({
      tipo: 'individual',
      participantes: { $all: [user1Id, user2Id] }
    }).populate('participantes', 'nombre apellido avatar');

    if (!conversacion) {
      // Crear nueva conversación
      conversacion = new Conversacion({
        participantes: [user1Id, user2Id],
        tipo: 'individual',
        mensajes: []
      });

      await conversacion.save();
      await conversacion.populate('participantes', 'nombre apellido avatar');
    }

    return conversacion;
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(conversacionId, emisorId, contenido) {
    const conversacion = await Conversacion.findById(conversacionId);

    if (!conversacion) {
      throw new Error('Conversación no encontrada');
    }

    // Verificar que el usuario sea participante
    if (!conversacion.participantes.includes(emisorId)) {
      throw new Error('No eres participante de esta conversación');
    }

    conversacion.mensajes.push({
      emisor: emisorId,
      contenido,
      leido: false
    });

    conversacion.ultimoMensaje = new Date();
    await conversacion.save();

    await conversacion.populate('mensajes.emisor', 'nombre apellido avatar');

    // Emitir evento en tiempo real
    try {
      emitToConversation(conversacionId, 'message:new', {
        conversacion: conversacion._id,
        mensaje: conversacion.mensajes[conversacion.mensajes.length - 1]
      });
    } catch (error) {
      console.error('Error emitiendo mensaje en tiempo real:', error);
    }

    return conversacion;
  }

  /**
   * Obtener conversaciones de un usuario
   */
  async getUserConversations(userId) {
    const conversaciones = await Conversacion.find({
      participantes: userId,
      activa: true
    })
      .populate('participantes', 'nombre apellido avatar')
      .populate('mensajes.emisor', 'nombre apellido avatar')
      .sort({ ultimoMensaje: -1 });

    return conversaciones;
  }

  /**
   * Obtener conversación por ID
   */
  async getConversationById(conversacionId, userId) {
    const conversacion = await Conversacion.findById(conversacionId)
      .populate('participantes', 'nombre apellido avatar')
      .populate('mensajes.emisor', 'nombre apellido avatar');

    if (!conversacion) {
      throw new Error('Conversación no encontrada');
    }

    // Verificar que el usuario sea participante
    if (!conversacion.participantes.some(p => p._id.toString() === userId.toString())) {
      throw new Error('No tienes acceso a esta conversación');
    }

    return conversacion;
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversacionId, userId) {
    const conversacion = await Conversacion.findById(conversacionId);

    if (!conversacion) {
      throw new Error('Conversación no encontrada');
    }

    conversacion.mensajes.forEach(mensaje => {
      if (mensaje.emisor.toString() !== userId.toString() && !mensaje.leido) {
        mensaje.leido = true;
        mensaje.fechaLectura = new Date();
      }
    });

    await conversacion.save();

    return conversacion;
  }

  /**
   * Obtener mensajes no leídos
   */
  async getUnreadCount(userId) {
    const conversaciones = await Conversacion.find({
      participantes: userId,
      activa: true
    });

    let unreadCount = 0;

    conversaciones.forEach(conv => {
      conv.mensajes.forEach(mensaje => {
        if (mensaje.emisor.toString() !== userId.toString() && !mensaje.leido) {
          unreadCount++;
        }
      });
    });

    return { unreadCount };
  }
}

module.exports = new ConversacionService();
