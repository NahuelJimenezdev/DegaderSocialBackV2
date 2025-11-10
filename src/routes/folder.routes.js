const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  obtenerCarpetas,
  crearCarpeta,
  obtenerCarpeta,
  actualizarCarpeta,
  eliminarCarpeta,
  compartirCarpeta,
  subirArchivo,
  eliminarArchivo,
  uploadMiddleware
} = require('../controllers/folderController');

// Todas las rutas requieren autenticación
// router.use(protect);

// GET /api/folders - Obtener carpetas del usuario
router.get('/', obtenerCarpetas);

// POST /api/folders - Crear nueva carpeta
router.post('/', crearCarpeta);

// GET /api/folders/:id - Obtener carpeta específica
router.get('/:id', obtenerCarpeta);

// PUT /api/folders/:id - Actualizar carpeta
router.put('/:id', actualizarCarpeta);

// DELETE /api/folders/:id - Eliminar carpeta
router.delete('/:id', eliminarCarpeta);

// POST /api/folders/:id/share - Compartir carpeta
router.post('/:id/share', compartirCarpeta);

// POST /api/folders/:id/files - Subir archivo a carpeta
router.post('/:id/files', uploadMiddleware, subirArchivo);

// DELETE /api/folders/:id/files/:fileId - Eliminar archivo de carpeta
router.delete('/:id/files/:fileId', eliminarArchivo);

module.exports = router;
