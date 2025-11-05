const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const User = require('../models/User');
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
        tipo: 'User',
        id: req.userId
      }
    });
    await notification.save();

    await friendship.populate([
      { path: 'solicitante', select: 'nombre apellido avatar' },
      { path: 'receptor', select: 'nombre apellido avatar' }
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
      .populate('solicitante', 'nombre apellido avatar email')
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
        tipo: 'User',
        id: req.userId
      }
    });
    await notification.save();

    await friendship.populate([
      { path: 'solicitante', select: 'nombre apellido avatar' },
      { path: 'receptor', select: 'nombre apellido avatar' }
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

    friendship.estado = 'rechazada';
    await friendship.save();

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
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { solicitante: req.userId, estado: 'aceptada' },
        { receptor: req.userId, estado: 'aceptada' }
      ]
    })
      .populate('solicitante', 'nombre apellido avatar email ultimaConexion')
      .populate('receptor', 'nombre apellido avatar email ultimaConexion')
      .sort({ fechaAceptacion: -1 });

    // Formatear respuesta para obtener solo el amigo (no el usuario actual)
    const friends = friendships.map(friendship => {
      const friend = friendship.solicitante._id.equals(req.userId)
        ? friendship.receptor
        : friendship.solicitante;

      return {
        ...friend.toObject(),
        fechaAmistad: friendship.fechaAceptacion,
        friendshipId: friendship._id
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

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { solicitante: req.userId, receptor: friendId },
        { solicitante: friendId, receptor: req.userId }
      ],
      estado: 'aceptada'
    });

    if (!friendship) {
      return res.status(404).json(formatErrorResponse('Amistad no encontrada'));
    }

    res.json(formatSuccessResponse('Amistad eliminada exitosamente'));
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
