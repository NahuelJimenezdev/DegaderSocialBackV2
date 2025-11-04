const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const GroupFolder = require('../models/GroupFolder');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener carpetas de un grupo
router.get('/grupo/:grupoId', async (req, res, next) => {
  try {
    const folders = await GroupFolder.find({
      grupo: req.params.grupoId,
      activo: true
    })
      .populate('creador', 'nombre apellido avatar')
      .populate('archivos.subidoPor', 'nombre apellido avatar');

    res.json({
      ok: true,
      data: folders
    });
  } catch (error) {
    next(error);
  }
});

// Crear carpeta
router.post('/', async (req, res, next) => {
  try {
    const folder = new GroupFolder({
      ...req.body,
      creador: req.user.id
    });

    await folder.save();

    res.status(201).json({
      ok: true,
      message: 'Carpeta creada exitosamente',
      data: folder
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
