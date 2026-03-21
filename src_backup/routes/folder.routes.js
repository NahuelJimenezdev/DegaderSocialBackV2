const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  obtenerJerarquia,
  obtenerCarpetas,
  crearCarpeta,
  obtenerCarpeta,
  actualizarCarpeta,
  eliminarCarpeta,
  compartirCarpeta,
  compartirMasivo,
  subirArchivo,
  eliminarArchivo,
  salirDeCarpeta,
  uploadMiddleware
} = require('../controllers/folderController');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/folders/jerarquia - Obtener estructura de jerarquía (Areas, Cargos, Niveles)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
router.get('/jerarquia', obtenerJerarquia);

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

// POST /api/folders/:id/share/bulk - Compartir carpeta masivamente
router.post('/:id/share/bulk', compartirMasivo);

// POST /api/folders/:id/leave - Salir de carpeta compartida
router.post('/:id/leave', salirDeCarpeta);

// POST /api/folders/:id/files - Subir archivo a carpeta
router.post('/:id/files', uploadMiddleware, subirArchivo);

// DELETE /api/folders/:id/files/:fileId - Eliminar archivo de carpeta
router.delete('/:id/files/:fileId', eliminarArchivo);

module.exports = router;
