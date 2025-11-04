const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const Resource = require('../models/Resource');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener todos los recursos
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, categoria } = req.query;
    const skip = (page - 1) * limit;

    const query = { activo: true };
    if (categoria) query.categoria = categoria;

    const resources = await Resource.find(query)
      .populate('autor', 'nombre apellido avatar')
      .populate('area', 'nombre')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Resource.countDocuments(query);

    res.json({
      ok: true,
      data: {
        resources,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Crear recurso
router.post('/', async (req, res, next) => {
  try {
    const resource = new Resource({
      ...req.body,
      autor: req.user.id
    });

    await resource.save();
    await resource.populate('autor', 'nombre apellido avatar');

    res.status(201).json({
      ok: true,
      message: 'Recurso creado exitosamente',
      data: resource
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
