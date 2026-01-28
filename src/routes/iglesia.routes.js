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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (aumentado para videos)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|mp4|webm|mov|quicktime/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp) y videos (mp4, webm, mov)'));
    }
  }
});

// Wrapper para manejar errores de multer
const uploadMiddleware = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'portada', maxCount: 1 },
    { name: 'galeria', maxCount: 10 },
    { name: 'multimedia', maxCount: 10 }
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
router.get('/stats/global', iglesiaController.getGlobalStats); // Antes de /:id para evitar conflicto
router.get('/:id', iglesiaController.obtenerIglesia);
router.post('/:id/join', iglesiaController.unirseIglesia);
router.post('/:id/leave', iglesiaController.leaveIglesia);
router.delete('/:id/join', iglesiaController.cancelarSolicitud);
router.put('/:id', uploadMiddleware, iglesiaController.updateIglesia);
router.post('/:id/solicitudes/:userId', iglesiaController.gestionarSolicitud);

// Rutas de Chat
router.get('/:id/messages', iglesiaController.getMessages);
router.post('/:id/messages', iglesiaController.sendMessage); // TODO: Agregar middleware de upload si se requiere
router.delete('/:id/messages/:messageId', iglesiaController.deleteMessage);
router.post('/:id/messages/:messageId/reactions', iglesiaController.reactToMessage);

// Rutas de Testimonios / Comentarios
const testimonialController = require('../controllers/iglesiaTestimonialController');
router.get('/:id/testimonios', testimonialController.obtenerTestimonios);
router.post('/:id/testimonios', testimonialController.crearTestimonio);
router.put('/:id/testimonios/:testimonioId', testimonialController.actualizarTestimonio);
router.delete('/:id/testimonios/:testimonioId', testimonialController.eliminarTestimonio);


// Rutas de Eventos de Iglesia
const churchEventController = require('../controllers/churchEventController');
router.post('/:iglesiaId/events', churchEventController.createEvent);
router.get('/:iglesiaId/events', churchEventController.getEventsByIglesia);
router.put('/events/:eventId', churchEventController.updateEvent); // Nueva ruta Editar
router.delete('/events/:eventId', churchEventController.deleteEvent); // Nueva ruta Cancelar/Eliminar
router.post('/:eventId/interact', churchEventController.interactWithEvent); // :eventId no está anidado porque es único
router.get('/:eventId/stats', churchEventController.getEventStats);


// Historial de salidas (Solo pastor)
router.get('/:id/ex-miembros', iglesiaController.getExMiembros);

module.exports = router;
