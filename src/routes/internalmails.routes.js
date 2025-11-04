const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const InternalMail = require('../models/InternalMail');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener correos recibidos
router.get('/inbox', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const mails = await InternalMail.find({
      'destinatarios.usuario': req.user.id,
      archivado: false
    })
      .populate('remitente', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await InternalMail.countDocuments({
      'destinatarios.usuario': req.user.id,
      archivado: false
    });

    res.json({
      ok: true,
      data: {
        mails,
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

// Obtener correos enviados
router.get('/sent', async (req, res, next) => {
  try {
    const mails = await InternalMail.find({
      remitente: req.user.id
    })
      .populate('destinatarios.usuario', 'nombre apellido avatar')
      .sort({ createdAt: -1 });

    res.json({
      ok: true,
      data: mails
    });
  } catch (error) {
    next(error);
  }
});

// Enviar correo
router.post('/', async (req, res, next) => {
  try {
    const mail = new InternalMail({
      ...req.body,
      remitente: req.user.id
    });

    await mail.save();

    res.status(201).json({
      ok: true,
      message: 'Correo enviado exitosamente',
      data: mail
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
