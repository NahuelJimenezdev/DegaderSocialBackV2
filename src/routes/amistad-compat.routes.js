const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const User = require('../models/User.model');
const friendshipController = require('../controllers/friendshipController');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas nuevas (compatibilidad con amistadService.js)
router.get('/friends', friendshipController.getFriends); // Added missing route
router.get('/status/:userId', friendshipController.getFriendshipStatus);
router.post('/request', friendshipController.sendFriendRequest);
router.post('/:id/accept', friendshipController.acceptFriendRequest);
router.post('/:id/reject', friendshipController.rejectFriendRequest);
router.delete('/:friendId', friendshipController.removeFriend);

// Rutas legacy (compatibilidad con friendshipService.js)

/**
 * GET /api/amistades/estado/:usuarioId
 * Obtener estado de amistad con un usuario específico
 */
router.get('/estado/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const currentUserId = req.user._id;

    // Buscar amistad en ambas direcciones
    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: currentUserId, receptor: usuarioId },
        { solicitante: usuarioId, receptor: currentUserId }
      ]
    });

    if (!friendship) {
      return res.json({ success: true, estado: 'default' });
    }

    // Determinar el estado desde la perspectiva del usuario actual
    let estado = 'default';

    if (friendship.estado === 'aceptada') {
      estado = 'aceptado';
    } else if (friendship.estado === 'pendiente') {
      // Si yo soy el solicitante, el estado es "enviada"
      if (friendship.solicitante.toString() === currentUserId.toString()) {
        estado = 'enviada';
      } else {
        // Si yo soy el receptor, el estado es "recibida"
        estado = 'recibida';
      }
    } else if (friendship.estado === 'rechazada') {
      estado = 'rechazado';
    }

    res.json({ success: true, estado });
  } catch (error) {
    console.error('Error al obtener estado de amistad:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estado' });
  }
});

/**
 * POST /api/amistades/solicitar
 * Enviar solicitud de amistad
 */
router.post('/solicitar', async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const currentUserId = req.user._id;

    // Validaciones
    if (!usuarioId) {
      return res.status(400).json({ success: false, message: 'usuarioId es requerido' });
    }

    if (usuarioId === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'No puedes enviarte solicitud a ti mismo' });
    }

    // Verificar que el usuario existe
    const targetUser = await User.findById(usuarioId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Verificar si ya existe una amistad
    const existingFriendship = await Friendship.findOne({
      $or: [
        { solicitante: currentUserId, receptor: usuarioId },
        { solicitante: usuarioId, receptor: currentUserId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.estado === 'aceptada') {
        return res.status(400).json({ success: false, message: 'Ya son amigos' });
      }
      if (existingFriendship.estado === 'pendiente') {
        return res.status(400).json({ success: false, message: 'Ya existe una solicitud pendiente' });
      }
    }

    // Crear solicitud
    const friendship = new Friendship({
      solicitante: currentUserId,
      receptor: usuarioId,
      estado: 'pendiente'
    });
    await friendship.save();

    // Crear notificación
    const notification = new Notification({
      receptor: usuarioId,
      emisor: currentUserId,
      tipo: 'solicitud_amistad',
      contenido: 'te envió una solicitud de amistad',
      referencia: {
        tipo: 'User',
        id: currentUserId
      }
    });
    await notification.save();

    // Emitir notificación en tiempo real con Socket.IO
    if (global.emitNotification) {
      await notification.populate('emisor', 'nombres apellidos social.fotoPerfil');

      // Estructura compatible con NotificationCard del frontend
      const nombreCompleto = `${req.user.nombres?.primero || ''} ${req.user.apellidos?.primero || ''}`.trim();
      const notificationData = {
        _id: notification._id,
        tipo: 'amistad', // Frontend espera 'amistad', no 'solicitud_amistad'
        mensaje: `${nombreCompleto} te envió una solicitud de amistad`,
        leido: false,
        fechaCreacion: notification.createdAt,
        remitenteId: {
          _id: req.user._id,
          nombre: req.user.nombres?.primero,
          apellido: req.user.apellidos?.primero,
          avatar: req.user.social?.fotoPerfil
        },
        datos: {
          nombre: nombreCompleto,
          avatar: req.user.social?.fotoPerfil,
          fromUserId: req.user._id
        }
      };

      global.emitNotification(usuarioId, notificationData);

      // Emitir actualización de estado a ambos usuarios
      global.emitNotification(currentUserId.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: usuarioId,
        nuevoEstado: 'enviada'
      });

      global.emitNotification(usuarioId, {
        tipo: 'amistad:actualizada',
        usuarioId: currentUserId.toString(),
        nuevoEstado: 'recibida'
      });
    }

    res.json({ success: true, message: 'Solicitud enviada exitosamente' });
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al enviar solicitud' });
  }
});

/**
 * POST /api/amistades/aceptar
 * Aceptar solicitud de amistad
 */
router.post('/aceptar', async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const currentUserId = req.user._id;

    // Buscar la solicitud pendiente
    const friendship = await Friendship.findOne({
      solicitante: usuarioId,
      receptor: currentUserId,
      estado: 'pendiente'
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // Actualizar estado
    friendship.estado = 'aceptada';
    await friendship.save();

    // Crear notificación para el solicitante
    const notification = new Notification({
      receptor: usuarioId,
      emisor: currentUserId,
      tipo: 'amistad_aceptada',
      contenido: 'aceptó tu solicitud de amistad',
      referencia: {
        tipo: 'User',
        id: currentUserId
      }
    });
    await notification.save();

    // Emitir notificación en tiempo real
    if (global.emitNotification) {
      const nombreCompleto = `${req.user.nombres?.primero || ''} ${req.user.apellidos?.primero || ''}`.trim();
      const notificationData = {
        _id: notification._id,
        tipo: 'amistad',
        mensaje: `${nombreCompleto} aceptó tu solicitud de amistad`,
        leido: false,
        fechaCreacion: notification.createdAt,
        remitenteId: {
          _id: req.user._id,
          nombre: req.user.nombres?.primero,
          apellido: req.user.apellidos?.primero,
          avatar: req.user.social?.fotoPerfil
        },
        datos: {
          nombre: nombreCompleto,
          avatar: req.user.social?.fotoPerfil,
          fromUserId: req.user._id
        }
      };

      global.emitNotification(usuarioId, notificationData);

      // Emitir actualización de estado a ambos usuarios
      global.emitNotification(currentUserId.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: usuarioId,
        nuevoEstado: 'aceptado'
      });

      global.emitNotification(usuarioId, {
        tipo: 'amistad:actualizada',
        usuarioId: currentUserId.toString(),
        nuevoEstado: 'aceptado'
      });
    }

    res.json({ success: true, message: 'Solicitud aceptada' });
  } catch (error) {
    console.error('Error al aceptar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al aceptar solicitud' });
  }
});

/**
 * POST /api/amistades/cancelar
 * Cancelar solicitud enviada O eliminar amistad existente
 */
router.post('/cancelar', async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const currentUserId = req.user._id;

    // Buscar la amistad
    const friendship = await Friendship.findOne({
      $or: [
        { solicitante: currentUserId, receptor: usuarioId },
        { solicitante: usuarioId, receptor: currentUserId }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
    }

    // Eliminar la amistad
    await Friendship.deleteOne({ _id: friendship._id });

    // Emitir actualización de estado a ambos usuarios
    if (global.emitNotification) {
      global.emitNotification(currentUserId.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: usuarioId,
        nuevoEstado: 'default'
      });

      global.emitNotification(usuarioId, {
        tipo: 'amistad:actualizada',
        usuarioId: currentUserId.toString(),
        nuevoEstado: 'default'
      });
    }

    res.json({ success: true, message: 'Amistad eliminada' });
  } catch (error) {
    console.error('Error al cancelar amistad:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar amistad' });
  }
});

/**
 * POST /api/amistades/rechazar
 * Rechazar solicitud recibida
 */
router.post('/rechazar', async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const currentUserId = req.user._id;

    // Buscar la solicitud pendiente
    const friendship = await Friendship.findOne({
      solicitante: usuarioId,
      receptor: currentUserId,
      estado: 'pendiente'
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // Eliminar la solicitud
    await Friendship.deleteOne({ _id: friendship._id });

    // Emitir actualización de estado a ambos usuarios
    if (global.emitNotification) {
      global.emitNotification(currentUserId.toString(), {
        tipo: 'amistad:actualizada',
        usuarioId: usuarioId,
        nuevoEstado: 'default'
      });

      global.emitNotification(usuarioId, {
        tipo: 'amistad:actualizada',
        usuarioId: currentUserId.toString(),
        nuevoEstado: 'default'
      });
    }

    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar solicitud' });
  }
});

module.exports = router;
