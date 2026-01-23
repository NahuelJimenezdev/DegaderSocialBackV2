const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const iglesiaController = require('../controllers/iglesiaController');
const { authenticate } = require('../middleware/auth.middleware');

// Configurar multer para uploads de iglesias (usando memoria para subir directamente a R2)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
  }
});

// Wrapper para manejar errores de multer
const uploadMiddleware = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'portada', maxCount: 1 },
    { name: 'galeria', maxCount: 10 }
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      console.error('❌ Multer Error:', err);
      return res.status(400).json({
        success: false,
        message: `Error al subir archivos: ${err.message}`
      });
    } else if (err) {
      // An unknown error occurred when uploading.
      console.error('❌ Upload Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    // Everything went fine.
    next();
  });
};

// Todas las rutas requieren autenticación
router.use(authenticate);

router.post('/', iglesiaController.crearIglesia);
router.get('/', iglesiaController.obtenerIglesias);
router.get('/:id', iglesiaController.obtenerIglesia);
router.post('/:id/join', iglesiaController.unirseIglesia);
router.delete('/:id/join', iglesiaController.cancelarSolicitud);
router.put('/:id', uploadMiddleware, iglesiaController.updateIglesia);
router.post('/:id/solicitudes/:userId', iglesiaController.gestionarSolicitud);

// Rutas de Chat
router.get('/:id/messages', iglesiaController.getMessages);
router.post('/:id/messages', iglesiaController.sendMessage); // TODO: Agregar middleware de upload si se requiere
router.delete('/:id/messages/:messageId', iglesiaController.deleteMessage);
router.post('/:id/messages/:messageId/reactions', iglesiaController.reactToMessage);

module.exports = router;
