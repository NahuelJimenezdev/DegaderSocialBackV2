const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const Area = require('../models/Area');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener todas las áreas
router.get('/', async (req, res, next) => {
  try {
    const areas = await Area.find({ activa: true })
      .populate('responsable', 'nombre apellido avatar')
      .populate('miembros', 'nombre apellido avatar');

    res.json({
      ok: true,
      data: areas
    });
  } catch (error) {
    next(error);
  }
});

// Obtener área por ID
router.get('/:id', async (req, res, next) => {
  try {
    const area = await Area.findById(req.params.id)
      .populate('responsable', 'nombre apellido avatar')
      .populate('miembros', 'nombre apellido avatar');

    if (!area || !area.activa) {
      return res.status(404).json({
        ok: false,
        error: 'Área no encontrada'
      });
    }

    res.json({
      ok: true,
      data: area
    });
  } catch (error) {
    next(error);
  }
});

// Crear área (solo admins)
router.post('/', async (req, res, next) => {
  try {
    const area = new Area(req.body);
    await area.save();

    res.status(201).json({
      ok: true,
      message: 'Área creada exitosamente',
      data: area
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
