const mongoose = require('mongoose');
const Friendship = require('../models/Friendship.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service'); // Nuevo Servicio V1 PRO
const logger = require('../config/logger');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Enviar solicitud de amistad
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

    const receptor = await User.findById(receptorId).exec();
    if (!receptor) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    const existingRequest = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: receptorId },
        { solicitante: receptorId, receptor: req.userId }
      ]
    }).exec();

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

    const friendship = new Friendship({
      solicitante: req.userId,
      receptor: receptorId,
      estado: 'pendiente'
    });

    await friendship.save();

    // 🏆 Notificación V1 PRO Centralizada — referencia precisa al Friendship
    notificationService.notify({
      receptorId: receptorId,
      emisorId: req.userId,
      tipo: 'solicitud_amistad',
      contenido: 'te envió una solicitud de amistad',
      referencia: { tipo: 'Friendship', id: friendship._id }
    }).catch(err => logger.error(`⚠️ [REQUEST] Error notificación service: ${err.message}`));

    await friendship.populate([
      { path: 'solicitante', select: 'nombres apellidos social.fotoPerfil' },
      { path: 'receptor', select: 'nombres apellidos social.fotoPerfil' }
    ]);

    res.status(201).json(formatSuccessResponse('Solicitud enviada exitosamente', friendship));
  } catch (error) {
    logger.error(`Error al enviar solicitud: ${error.message}`, { stack: error.stack });
    res.status(500).json(formatErrorResponse('Error al enviar solicitud', [error.message]));
  }
};

/**
 * Obtener solicitudes pendientes
 */
const getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      receptor: req.userId,
      estado: 'pendiente'
    })
      .populate('solicitante', 'nombres apellidos social.fotoPerfil email')
      .sort({ createdAt: -1 })
      .exec();

    res.json(formatSuccessResponse('Solicitudes obtenidas', requests));
  } catch (error) {
    logger.error(`Error al obtener solicitudes: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al obtener solicitudes', [error.message]));
  }
};

/**
 * Aceptar solicitud de amistad (Nivel DIOS + Service Decoupling)
 */
const acceptFriendRequest = async (req, res) => {
  const session = await mongoose.startSession();
  
  const transactionOptions = {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary'
  };

  session.startTransaction(transactionOptions);

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      await session.abortTransaction();
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const friendship = await Friendship.findById(id).session(session).exec();

    if (!friendship || !friendship.receptor.equals(req.userId)) {
      await session.abortTransaction();
      return res.status(403).json(formatErrorResponse('Permiso denegado o solicitud inexistente'));
    }

    if (friendship.estado === 'aceptada') {
      await session.abortTransaction();
      return res.status(400).json(formatErrorResponse('La solicitud ya fue aceptada previamente'));
    }

    if (friendship.estado !== 'pendiente') {
      await session.abortTransaction();
      return res.status(400).json(formatErrorResponse('La solicitud ya no está pendiente'));
    }

    // 1. Actualizar Estado de Amistad
    friendship.estado = 'aceptada';
    friendship.fechaAceptacion = new Date();
    await friendship.save({ session });

    // 2. Sincronizar Usuarios (Pipeline Consistency)
    const updatePipeline = (friendId) => [
      {
        $set: {
          amigos: { $setUnion: [{ $ifNull: ["$amigos", []] }, [friendId]] },
          "social.stats.amigos": {
            $cond: [
              { $in: [friendId, { $ifNull: ["$amigos", []] }] },
              "$social.stats.amigos",
              { $add: [{ $ifNull: ["$social.stats.amigos", 0] }, 1] }
            ]
          }
        }
      }
    ];

    await User.updateOne({ _id: friendship.solicitante }, updatePipeline(friendship.receptor), { session });
    await User.updateOne({ _id: friendship.receptor }, updatePipeline(friendship.solicitante), { session });

    await session.commitTransaction();
    logger.info(`✅ [ACCEPT FRIEND] Transacción Exitosa: ${id}`);

    // --- Efectos Secundarios (Desacoplados) ---
    // Marcar notificación original como accionada (preciso por referencia.id)
    Notification.updateOne(
      { tipo: 'solicitud_amistad', 'referencia.id': friendship._id },
      { $set: { accionada: true, estadoAccion: 'aceptado', read: true } }
    ).catch(err => logger.error(`⚠️ [ACCEPT FRIEND] Error marcando notif: ${err.message}`));

    notificationService.notify({
      receptorId: friendship.solicitante,
      emisorId: req.userId,
      tipo: 'amistad_aceptada',
      contenido: 'aceptó tu solicitud de amistad',
      referencia: { tipo: 'Friendship', id: friendship._id }
    }).catch(err => logger.error(`⚠️ [ACCEPT FRIEND] Error v1-pro-notify: ${err.message}`));

    // Emisión de estados adicionales para sincronización de UI
    if (global.emitNotification) {
      const emitUpdate = (uid, friendUid) => global.emitNotification(uid, {
        tipo: 'amistad:actualizada',
        usuarioId: friendUid,
        nuevoEstado: 'aceptado'
      });
      emitUpdate(friendship.solicitante.toString(), req.userId.toString());
      emitUpdate(req.userId.toString(), friendship.solicitante.toString());
    }

    res.json(formatSuccessResponse('Solicitud aceptada exitosamente', friendship));
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    logger.error(`❌ [ACCEPT FRIEND] Error: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al procesar amistad', [error.message]));
  } finally {
    session.endSession();
  }
};

/**
 * Rechazar solicitud de amistad
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const friendship = await Friendship.findById(id).exec();
    if (!friendship) return res.status(404).json(formatErrorResponse('Solicitud no encontrada'));

    if (!friendship.receptor.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso'));
    }

    if (friendship.estado !== 'pendiente') {
      return res.status(400).json(formatErrorResponse('La solicitud ya fue procesada'));
    }

    friendship.estado = 'rechazada';
    await friendship.save();

    // Marcar notificación original como accionada
    Notification.updateOne(
      { tipo: 'solicitud_amistad', 'referencia.id': friendship._id },
      { $set: { accionada: true, estadoAccion: 'rechazado', read: true } }
    ).catch(err => logger.error(`⚠️ [REJECT FRIEND] Error marcando notif: ${err.message}`));

    // Notificación de rechazo (Socket simple, opcional persistencia)
    if (global.emitNotification) {
      global.emitNotification(friendship.solicitante.toString(), {
        tipo: 'solicitud_rechazada',
        usuarioId: req.userId.toString()
      });
    }

    res.json(formatSuccessResponse('Solicitud rechazada'));
  } catch (error) {
    logger.error(`Error al rechazar solicitud: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al rechazar', [error.message]));
  }
};

/**
 * Obtener lista de amigos
 */
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { solicitante: req.userId, estado: 'aceptada' },
        { receptor: req.userId, estado: 'aceptada' },
        { solicitante: req.userId, estado: 'bloqueada', bloqueadoPor: req.userId },
        { receptor: req.userId, estado: 'bloqueada', bloqueadoPor: req.userId }
      ]
    })
      .populate('solicitante', 'nombres apellidos social email seguridad.ultimaConexion personal username')
      .populate('receptor', 'nombres apellidos social email seguridad.ultimaConexion personal username')
      .sort({ fechaAceptacion: -1 })
      .exec();

    const friends = friendships
      .filter(f => f.solicitante && f.receptor)
      .map(f => {
        const isSolicitante = f.solicitante._id.equals(req.userId);
        const friend = isSolicitante ? f.receptor : f.solicitante;
        const config = isSolicitante ? 'solicitante' : 'receptor';

        return {
          ...friend.toObject(),
          fechaAmistad: f.fechaAceptacion,
          friendshipId: f._id,
          isFavorite: f.favoritos[config] || false,
          isPinned: f.fijado[config] || false,
          isMuted: f.silenciado[config] || false,
          isBlocked: f.estado === 'bloqueada'
        };
      });

    res.json(formatSuccessResponse('Amigos obtenidos', friends));
  } catch (error) {
    logger.error(`Error al obtener amigos: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al obtener', [error.message]));
  }
};

/**
 * Eliminar amistad (Nivel ÉLITE + Service Decoupling)
 */
const removeFriend = async (req, res) => {
  const session = await mongoose.startSession();
  
  const transactionOptions = {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary'
  };

  session.startTransaction(transactionOptions);

  try {
    const { friendId } = req.params;
    if (!isValidObjectId(friendId)) {
      await session.abortTransaction();
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: friendId },
        { solicitante: friendId, receptor: req.userId }
      ]
    }).session(session).exec();

    if (!friendship) {
      await session.abortTransaction();
      return res.status(404).json(formatErrorResponse('Vínculo no encontrado'));
    }

    const esSolicitante = friendship.solicitante.equals(req.userId);
    const estadoAnterior = friendship.estado;
    const otherUserId = esSolicitante ? friendship.receptor : friendship.solicitante;

    if (estadoAnterior === 'aceptada') {
      const removePipeline = (uIdToRemove) => [
        {
          $set: {
            amigos: { $setDifference: [{ $ifNull: ["$amigos", []] }, [uIdToRemove]] },
            "social.stats.amigos": {
              $cond: [
                { $in: [uIdToRemove, { $ifNull: ["$amigos", []] }] },
                { $subtract: ["$social.stats.amigos", 1] },
                "$social.stats.amigos"
              ]
            }
          }
        }
      ];

      await User.updateOne({ _id: req.userId }, removePipeline(otherUserId), { session });
      await User.updateOne({ _id: otherUserId }, removePipeline(req.userId), { session });
    }

    await Friendship.findByIdAndDelete(friendship._id, { session }).exec();

    await session.commitTransaction();
    logger.info(`✅ [REMOVE FRIEND] Ejecución Exitosa: ${friendship._id}`);

    // Notificación centralizada (solo si eran amigos aceptados)
    if (estadoAnterior === 'aceptada') {
      notificationService.notify({
        receptorId: otherUserId,
        emisorId: req.userId,
        tipo: 'amistad_eliminada',
        contenido: 'eliminó la amistad'
      }).catch(err => logger.error(`⚠️ [REMOVE FRIEND] Error v1-pro-notify: ${err.message}`));
      
      if (global.emitNotification) {
        global.emitNotification(friendId, { tipo: 'amistad_eliminada', usuarioId: req.userId });
      }
    }

    res.json(formatSuccessResponse(estadoAnterior === 'aceptada' ? 'Amistad eliminada' : 'Solicitud cancelada'));
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    logger.error(`❌ [REMOVE FRIEND] Error en transacción: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error al eliminar', [error.message]));
  } finally {
    session.endSession();
  }
};

/**
 * Verificar estado de amistad
 */
const getFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return res.status(400).json(formatErrorResponse('ID inválido'));

    if (userId === req.userId.toString()) {
      return res.json({ success: true, data: { status: 'self' } });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: req.userId, receptor: userId },
        { solicitante: userId, receptor: req.userId }
      ]
    }).exec();

    if (!friendship) return res.json({ success: true, data: { status: 'none' } });

    res.json(formatSuccessResponse('Estado obtenido', {
      status: friendship.estado,
      friendshipId: friendship._id,
      isSender: friendship.solicitante.equals(req.userId)
    }));
  } catch (error) {
    logger.error(`Error al verificar estado: ${error.message}`);
    res.status(500).json(formatErrorResponse('Error', [error.message]));
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
