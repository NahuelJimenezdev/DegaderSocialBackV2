const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const Usuario = require('../models/User');

/**
 * GET /api/buscar?q={query}
 * Buscar usuarios por nombre o apellido
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    // Validar que haya un término de búsqueda
    if (!q || q.trim().length < 2) {
      return res.json({
        exito: true,
        resultados: {
          usuarios: []
        }
      });
    }

    // Buscar usuarios que coincidan con el término (excluyendo al usuario actual)
    const usuarios = await Usuario.find({
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { apellido: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Excluir al usuario actual
    })
      .select('nombre apellido email avatar rol ciudad')
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
