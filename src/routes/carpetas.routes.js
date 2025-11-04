const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const Carpeta = require('../models/Carpeta');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener carpetas del usuario
router.get('/', async (req, res, next) => {
  try {
    const carpetas = await Carpeta.find({
      $or: [
        { propietario: req.user.id },
        { 'compartidaCon.usuario': req.user.id }
      ],
      activa: true
    })
      .populate('propietario', 'nombre apellido avatar')
      .populate('compartidaCon.usuario', 'nombre apellido avatar');

    res.json({
      ok: true,
      data: carpetas
    });
  } catch (error) {
    next(error);
  }
});

// Crear carpeta
router.post('/', async (req, res, next) => {
  try {
    const carpeta = new Carpeta({
      ...req.body,
      propietario: req.user.id
    });

    await carpeta.save();

    res.status(201).json({
      ok: true,
      message: 'Carpeta creada exitosamente',
      data: carpeta
    });
  } catch (error) {
    next(error);
  }
});

// Subir archivo a carpeta
router.post('/:id/upload', async (req, res, next) => {
  try {
    const carpeta = await Carpeta.findById(req.params.id);

    if (!carpeta) {
      return res.status(404).json({
        ok: false,
        error: 'Carpeta no encontrada'
      });
    }

    // Verificar permisos
    const isOwner = carpeta.propietario.toString() === req.user.id.toString();
    const hasPermission = carpeta.compartidaCon.some(
      c => c.usuario.toString() === req.user.id.toString() &&
           ['escritura', 'admin'].includes(c.permisos)
    );

    if (!isOwner && !hasPermission) {
      return res.status(403).json({
        ok: false,
        error: 'No tienes permisos para subir archivos a esta carpeta'
      });
    }

    carpeta.archivos.push(req.body);
    await carpeta.save();

    res.json({
      ok: true,
      message: 'Archivo subido exitosamente',
      data: carpeta
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
