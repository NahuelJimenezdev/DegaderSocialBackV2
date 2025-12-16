const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Enviar solicitud de amistad
 * POST /api/amistades/request
 */
const sendFriendRequest = async (req, res) => {
  try {
    const { receptorId } = req.body;

    if (!isValidObjectId(receptorId)) {
      return res.status(400).json(formatErrorResponse('ID de receptor inválido'));
    }

    if (receptorId === req.userId.toString()) {
      return res.status(400).json(formatErrorResponse('No puedes enviarte una solicitud a ti mismo'));
    }

    // Verificar que el receptor existe
    const receptor = await User.findById(receptorId);
    if (!receptor) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Verificar si ya existe una solicitud
    const existingRequest = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: receptorId },
        { solicitante: receptorId, receptor: req.userId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.estado === 'bloqueada') {
        return res.status(403).json(formatErrorResponse('No es posible enviar la solicitud. Usuario bloqueado.'));
      }
      if (existingRequest.estado === 'aceptada') {
        return res.status(400).json(formatErrorResponse('Ya son amigos'));
      }
      if (existingRequest.estado === 'pendiente') {
        return res.status(400).json(formatErrorResponse('Ya existe una solicitud pendiente'));
      }
    }

    // Crear solicitud
    const friendship = new Friendship({
      solicitante: req.userId,
      receptor: receptorId,
      estado: 'pendiente'
    });

    await friendship.save();

    // Crear notificación
    const notification = new Notification({
      receptor: receptorId,
      emisor: req.userId,
      tipo: 'solicitud_amistad',
      contenido: 'te envió una solicitud de amistad',
      referencia: {
        tipo: 'UserV2',
        id: req.userId
      }
    });
    await notification.save();

    // Poblar emisor para la notificación en tiempo real
    await notification.populate('emisor', 'nombres apellidos social.fotoPerfil');

    // Emitir notificación en tiempo real
    if (global.emitNotification) {
      global.emitNotification(receptorId, notification);
    }

    await friendship.populate([
      { path: 'solicitante', select: 'nombres apellidos social.fotoPerfil' },
      { path: 'receptor', select: 'nombres apellidos social.fotoPerfil' }
    ]);

    res.status(201).json(formatSuccessResponse('Solicitud enviada exitosamente', friendship));
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al enviar solicitud', [error.message]));
  }
};

/**
 * Obtener solicitudes pendientes
 * GET /api/amistades/pending
 */
const getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      receptor: req.userId,
      estado: 'pendiente'
    })
      .populate('solicitante', 'nombres apellidos social.fotoPerfil email')
      .sort({ createdAt: -1 });

    res.json(formatSuccessResponse('Solicitudes obtenidas', requests));
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json(formatErrorResponse('Error al obtener solicitudes', [error.message]));
  }
};

/**
 * Aceptar solicitud de amistad
 * POST /api/amistades/:id/accept
 */
const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const friendship = await Friendship.findById(id);

    if (!friendship) {
      return res.status(404).json(formatErrorResponse('Solicitud no encontrada'));
    }

    // Verificar que el usuario autenticado es el receptor
    if (!friendship.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para aceptar esta solicitud'));
    }

    if (friendship.estado !== 'pendiente') {
      return res.status(400).json(formatErrorResponse('La solicitud ya fue procesada'));
    }

    friendship.estado = 'aceptada';
    friendship.fechaAceptacion = new Date();
    await friendship.save();

    // Crear notificación para el solicitante
    const notification = new Notification({
      receptor: friendship.solicitante,
      emisor: req.userId,
      tipo: 'amistad_aceptada',
      contenido: 'aceptó tu solicitud de amistad',
      referencia: {
        tipo: 'UserV2',
        id: req.userId
      }
    });
    await notification.save();

    // Poblar emisor para la notificación en tiempo real
    await notification.populate('emisor', 'nombres apellidos social.fotoPerfil');

    // Emitir notificación en tiempo real
    if (global.emitNotification) {
      global.emitNotification(friendship.solicitante, notification);

      // Emitir actualización de estado a ambos usuarios para actualizar botones en tiempo real
      global.emitNotification(friendship.solicitante.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: req.userId.toString(),
        nuevoEstado: 'aceptado'
      });

      global.emitNotification(req.userId.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: friendship.solicitante.toString(),
        nuevoEstado: 'aceptado'
      });
    }

    await friendship.populate([
      { path: 'solicitante', select: 'nombres apellidos social.fotoPerfil' },
      { path: 'receptor', select: 'nombres apellidos social.fotoPerfil' }
    ]);

    res.json(formatSuccessResponse('Solicitud aceptada exitosamente', friendship));
  } catch (error) {
    console.error('Error al aceptar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al aceptar solicitud', [error.message]));
  }
};

/**
 * Rechazar solicitud de amistad
 * POST /api/amistades/:id/reject
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const friendship = await Friendship.findById(id);

    if (!friendship) {
      return res.status(404).json(formatErrorResponse('Solicitud no encontrada'));
    }

    // Verificar que el usuario autenticado es el receptor
    if (!friendship.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para rechazar esta solicitud'));
    }

    if (friendship.estado !== 'pendiente') {
      return res.status(400).json(formatErrorResponse('La solicitud ya fue procesada'));
    }

    const solicitanteId = friendship.solicitante.toString();

    friendship.estado = 'rechazada';
    await friendship.save();

    // Emitir evento en tiempo real al solicitante para que elimine su notificación
    if (global.emitNotification) {
      global.emitNotification(solicitanteId, {
        tipo: 'solicitud_rechazada',
        usuarioId: req.userId.toString(),
        mensaje: 'Tu solicitud de amistad fue rechazada'
      });
    }

    res.json(formatSuccessResponse('Solicitud rechazada'));
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al rechazar solicitud', [error.message]));
  }
};

/**
 * Obtener lista de amigos
 * GET /api/amistades/friends
 */
// Obtener lista de amigos
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { solicitante: req.userId, estado: 'aceptada' },
        { receptor: req.userId, estado: 'aceptada' },
        // Incluir bloqueados por el usuario actual (asimetría)
        { solicitante: req.userId, estado: 'bloqueada', bloqueadoPor: req.userId },
        { receptor: req.userId, estado: 'bloqueada', bloqueadoPor: req.userId }
      ]
    })
      .populate('solicitante', 'nombres apellidos social email seguridad.ultimaConexion personal')
      .populate('receptor', 'nombres apellidos social email seguridad.ultimaConexion personal')
      .sort({ fechaAceptacion: -1 });

    // Formatear respuesta para obtener solo el amigo (no el usuario actual)
    const friends = friendships
      .filter(friendship => {
        // Filtrar amistades donde alguno de los usuarios fue eliminado
        if (!friendship.solicitante || !friendship.receptor) {
          console.warn(`⚠️ Amistad con usuario eliminado encontrada: ${friendship._id}`);
          return false;
        }
        return true;
      })
      .map(friendship => {
        const isSolicitante = friendship.solicitante._id.equals(req.userId);
        const friend = isSolicitante
          ? friendship.receptor
          : friendship.solicitante;

        // Obtener configuración según el rol del usuario
        const userConfig = isSolicitante ? 'solicitante' : 'receptor';

        const isBlocked = friendship.estado === 'bloqueada';

        return {
          ...friend.toObject(),
          fechaAmistad: friendship.fechaAceptacion,
          friendshipId: friendship._id,
          // Agregar campos de gestión de amigos
          isFavorite: friendship.favoritos[userConfig] || false,
          isPinned: friendship.fijado[userConfig] || false,
          isMuted: friendship.silenciado[userConfig] || false,
          isBlocked // Flag para el frontend
        };
      });

    res.json(formatSuccessResponse('Amigos obtenidos', friends));
  } catch (error) {
    console.error('Error al obtener amigos:', error);
    res.status(500).json(formatErrorResponse('Error al obtener amigos', [error.message]));
  }
};

/**
 * Eliminar amistad
 * DELETE /api/amistades/:friendId
 */
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!isValidObjectId(friendId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Buscar la amistad primero (sin eliminar aún)
    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: friendId },
        { solicitante: friendId, receptor: req.userId }
      ]
    });

    if (!friendship) {
      return res.status(404).json(formatErrorResponse('Amistad o solicitud no encontrada'));
    }

    const esSolicitante = friendship.solicitante.equals(req.userId);
    const estadoAnterior = friendship.estado;
    const otherUserId = esSolicitante ? friendship.receptor : friendship.solicitante;

    // Emitir evento en tiempo real según el estado ANTES de eliminar
    if (global.emitNotification) {
      if (estadoAnterior === 'aceptada') {
        // Crear notificación persistente para el otro usuario
        const notification = new Notification({
          receptor: otherUserId,
          emisor: req.userId,
          tipo: 'amistad_eliminada',
          contenido: 'eliminó la amistad',
          referencia: {
            tipo: 'UserV2',
            id: req.userId
          }
        });
        await notification.save();

        // Poblar emisor para la notificación en tiempo real
        await notification.populate('emisor', 'nombres apellidos social.fotoPerfil');

        // Amistad aceptada eliminada
        global.emitNotification(friendId, notification);

        global.emitNotification(req.userId.toString(), {
          tipo: 'amistad_eliminada',
          usuarioId: friendId,
          mensaje: 'Amistad eliminada'
        });
      } else if (estadoAnterior === 'pendiente') {
        // Solicitud pendiente cancelada
        if (esSolicitante) {
          // El solicitante canceló su propia solicitud
          const notification = new Notification({
            receptor: friendId,
            emisor: req.userId,
            tipo: 'solicitud_cancelada',
            contenido: 'canceló la solicitud de amistad',
            referencia: {
              tipo: 'UserV2',
              id: req.userId
            }
          });
          await notification.save();

          // Poblar emisor para la notificación en tiempo real
          await notification.populate('emisor', 'nombres apellidos social.fotoPerfil');

          global.emitNotification(friendId, notification);
        }
      }
    }

    // Ahora sí eliminar la amistad
    await Friendship.findByIdAndDelete(friendship._id);

    const mensaje = estadoAnterior === 'aceptada'
      ? 'Amistad eliminada exitosamente'
      : 'Solicitud cancelada exitosamente';

    res.json(formatSuccessResponse(mensaje));
  } catch (error) {
    console.error('Error al eliminar amistad:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar amistad', [error.message]));
  }
};

/**
 * Verificar estado de amistad con un usuario
 * GET /api/amistades/status/:userId
 */
const getFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (userId === req.userId.toString()) {
      return res.json({
        success: true,
        data: { status: 'self' }
      });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: userId },
        { solicitante: userId, receptor: req.userId }
      ]
    });

    if (!friendship) {
      return res.json({
        success: true,
        data: { status: 'none' }
      });
    }

    const status = {
      status: friendship.estado,
      friendshipId: friendship._id,
      isSender: friendship.solicitante.equals(req.userId)
    };

    res.json(formatSuccessResponse('Estado obtenido', status));
  } catch (error) {
    console.error('Error al verificar estado:', error);
    res.status(500).json(formatErrorResponse('Error al verificar estado', [error.message]));
  }
};

module.exports = {
  sendFriendRequest,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getFriendshipStatus
};
