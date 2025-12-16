const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const Usuario = require('../models/User.model');
const Friendship = require('../models/Friendship'); // Importar modelo Friendship

/**
 * GET /api/buscar?q={query}
 * Buscar usuarios por nombre o apellido
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    // Validar que haya un término de búsqueda
    if (!q || q.trim().length < 2) {
      return res.json({
        exito: true,
        resultados: {
          usuarios: []
        }
      });
    }

    // 1. Obtener lista de usuarios bloqueados (en ambas direcciones)
    const blockedFriendships = await Friendship.find({
      $or: [
        { solicitante: currentUserId, estado: 'bloqueada' },
        { receptor: currentUserId, estado: 'bloqueada' }
      ]
    });

    // Extraer los IDs de los usuarios bloqueados
    const blockedUserIds = blockedFriendships.map(f =>
      f.solicitante.toString() === currentUserId.toString()
        ? f.receptor
        : f.solicitante
    );

    // Buscar usuarios que coincidan con el término
    const usuarios = await Usuario.find({
      $or: [
        { 'nombres.primero': { $regex: q, $options: 'i' } },
        { 'nombres.segundo': { $regex: q, $options: 'i' } },
        { 'apellidos.primero': { $regex: q, $options: 'i' } },
        { 'apellidos.segundo': { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      _id: {
        $ne: currentUserId, // Excluir al usuario actual
        $nin: blockedUserIds // Excluir usuarios bloqueados
      }
    })
      .select('nombres apellidos email social.fotoPerfil social.fotoBanner seguridad.rolSistema personal.ubicacion.ciudad')
      .limit(10);

    res.json({
      exito: true,
      resultados: {
        usuarios
      }
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en la búsqueda',
      error: error.message
    });
  }
});

module.exports = router;
