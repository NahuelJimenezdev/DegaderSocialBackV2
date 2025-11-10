const Folder = require('../models/Folder');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { formatSuccessResponse, formatErrorResponse } = require('../utils/responseFormatter');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/folders', req.params.id);
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir la mayoría de tipos de archivos
    const allowedMimes = [
      // Imágenes
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
      // Documentos
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Comprimidos
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Función auxiliar para determinar tipo de archivo
const determinarTipoArchivo = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'spreadsheet';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
  if (mimetype === 'text/plain') return 'text';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return 'archive';
  return 'file';
};

/**
 * Obtener carpetas del usuario
 * GET /api/folders?tipo=personal
 */
const obtenerCarpetas = async (req, res) => {
  try {
    const { tipo } = req.query;
    const userId = req.userId;

    const carpetas = await Folder.obtenerCarpetasUsuario(userId, tipo);

    res.json(formatSuccessResponse('Carpetas obtenidas exitosamente', {
      carpetas,
      total: carpetas.length
    }));

  } catch (error) {
    console.error('Error al obtener carpetas:', error);
    res.status(500).json(formatErrorResponse('Error al obtener carpetas', [error.message]));
  }
};

/**
 * Crear nueva carpeta
 * POST /api/folders
 */
const crearCarpeta = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      color,
      icono,
      compartirCon,
      visibilidadPorCargo,
      visibilidadPorArea,
      visibilidadGeografica
    } = req.body;
    const userId = req.userId;

    console.log(`📁 Creando carpeta "${nombre}" para usuario: ${userId}`);

    // Validaciones
    if (!nombre || nombre.trim().length < 3) {
      return res.status(400).json(formatErrorResponse('El nombre debe tener al menos 3 caracteres'));
    }

    if (!descripcion || descripcion.trim().length < 10) {
      return res.status(400).json(formatErrorResponse('La descripción debe tener al menos 10 caracteres'));
    }

    // Verificar si ya existe una carpeta con el mismo nombre
    const carpetaExistente = await Folder.findOne({
      propietario: userId,
      nombre: nombre.trim(),
      activa: true
    });

    if (carpetaExistente) {
      return res.status(400).json(formatErrorResponse('Ya tienes una carpeta con este nombre'));
    }

    // Crear carpeta
    const nuevaCarpeta = new Folder({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      propietario: userId,
      tipo: tipo || 'personal',
      color: color || '#3B82F6',
      icono: icono || 'folder'
    });

    // Sistema de visibilidad por cargo
    if (visibilidadPorCargo) {
      nuevaCarpeta.visibilidadPorCargo = {
        habilitado: visibilidadPorCargo.habilitado || false,
        cargos: visibilidadPorCargo.cargos || []
      };
    }

    // Sistema de visibilidad por área
    if (visibilidadPorArea) {
      nuevaCarpeta.visibilidadPorArea = {
        habilitado: visibilidadPorArea.habilitado || false,
        areas: visibilidadPorArea.areas || []
      };
    }

    // Sistema de visibilidad geográfica
    if (visibilidadGeografica) {
      nuevaCarpeta.visibilidadGeografica = {
        habilitado: visibilidadGeografica.habilitado || false,
        pais: visibilidadGeografica.pais || undefined,
        ciudad: visibilidadGeografica.ciudad || undefined,
        subdivision: visibilidadGeografica.subdivision || undefined
      };
    }

    // Compartir con usuarios específicos
    if (compartirCon && Array.isArray(compartirCon)) {
      nuevaCarpeta.compartidaCon = compartirCon.map(item => ({
        usuario: item.usuario,
        permisos: item.permisos || 'lectura'
      }));
    }

    await nuevaCarpeta.save();

    // Poblar datos
    await nuevaCarpeta.populate('propietario', 'nombre apellido email avatar cargo area');
    await nuevaCarpeta.populate('compartidaCon.usuario', 'nombre apellido email avatar');

    console.log(`✅ Carpeta "${nombre}" creada exitosamente`);

    res.status(201).json(formatSuccessResponse('Carpeta creada exitosamente', nuevaCarpeta));

  } catch (error) {
    console.error('Error al crear carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al crear carpeta', [error.message]));
  }
};

/**
 * Obtener carpeta específica
 * GET /api/folders/:id
 */
const obtenerCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const carpeta = await Folder.findById(id)
      .populate('propietario', 'nombre apellido email avatar cargo area')
      .populate('compartidaCon.usuario', 'nombre apellido email avatar');

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Verificar permisos
    if (!await carpeta.tienePermiso(userId, 'lectura')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para acceder a esta carpeta'));
    }

    res.json(formatSuccessResponse('Carpeta obtenida exitosamente', carpeta));

  } catch (error) {
    console.error('Error al obtener carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al obtener carpeta', [error.message]));
  }
};

/**
 * Actualizar carpeta
 * PUT /api/folders/:id
 */
const actualizarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, color, icono } = req.body;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Solo el propietario puede editar
    if (!await carpeta.tienePermiso(userId, 'admin')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para editar esta carpeta'));
    }

    // Actualizar campos
    if (nombre) carpeta.nombre = nombre.trim();
    if (descripcion) carpeta.descripcion = descripcion.trim();
    if (color) carpeta.color = color;
    if (icono) carpeta.icono = icono;

    await carpeta.save();

    res.json(formatSuccessResponse('Carpeta actualizada exitosamente', carpeta));

  } catch (error) {
    console.error('Error al actualizar carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar carpeta', [error.message]));
  }
};

/**
 * Eliminar carpeta (soft delete)
 * DELETE /api/folders/:id
 */
const eliminarCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Solo el propietario puede eliminar
    const propietarioId = carpeta.propietario._id ? carpeta.propietario._id.toString() : carpeta.propietario.toString();
    if (propietarioId !== userId.toString()) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para eliminar esta carpeta'));
    }

    // Eliminación lógica
    carpeta.activa = false;
    await carpeta.save();

    res.json(formatSuccessResponse('Carpeta eliminada exitosamente'));

  } catch (error) {
    console.error('Error al eliminar carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar carpeta', [error.message]));
  }
};

/**
 * Compartir carpeta con usuario
 * POST /api/folders/:id/share
 */
const compartirCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId, permisos } = req.body;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Solo el propietario puede compartir
    const propietarioId = carpeta.propietario._id ? carpeta.propietario._id.toString() : carpeta.propietario.toString();
    if (propietarioId !== userId.toString()) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para compartir esta carpeta'));
    }

    // Verificar si ya está compartida con este usuario
    const yaCompartida = carpeta.compartidaCon.find(
      item => item.usuario.toString() === usuarioId.toString()
    );

    if (yaCompartida) {
      yaCompartida.permisos = permisos || 'lectura';
    } else {
      carpeta.compartidaCon.push({
        usuario: usuarioId,
        permisos: permisos || 'lectura'
      });
    }

    await carpeta.save();

    res.json(formatSuccessResponse('Carpeta compartida exitosamente', carpeta));

  } catch (error) {
    console.error('Error al compartir carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al compartir carpeta', [error.message]));
  }
};

/**
 * Subir archivo a carpeta
 * POST /api/folders/:id/files
 */
const subirArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Verificar permisos de escritura
    if (!await carpeta.tienePermiso(userId, 'escritura')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para subir archivos a esta carpeta'));
    }

    if (!req.file) {
      return res.status(400).json(formatErrorResponse('No se ha proporcionado ningún archivo'));
    }

    // Crear URL del archivo
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const relativePath = `uploads/folders/${id}/${req.file.filename}`;
    const fileUrl = `${baseUrl}/${relativePath}`;

    // Crear objeto archivo
    const nuevoArchivo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      tipo: determinarTipoArchivo(req.file.mimetype),
      url: fileUrl,
      uploadedAt: new Date()
    };

    carpeta.archivos.push(nuevoArchivo);
    await carpeta.save();

    console.log(`📤 Archivo "${req.file.originalname}" subido a carpeta "${carpeta.nombre}"`);

    res.status(201).json(formatSuccessResponse('Archivo subido exitosamente', nuevoArchivo));

  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json(formatErrorResponse('Error al subir archivo', [error.message]));
  }
};

/**
 * Eliminar archivo de carpeta
 * DELETE /api/folders/:id/files/:fileId
 */
const eliminarArchivo = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Verificar permisos de escritura
    if (!await carpeta.tienePermiso(userId, 'escritura')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para eliminar archivos de esta carpeta'));
    }

    // Buscar y eliminar el archivo
    const archivoIndex = carpeta.archivos.findIndex(
      archivo => archivo._id.toString() === fileId
    );

    if (archivoIndex === -1) {
      return res.status(404).json(formatErrorResponse('Archivo no encontrado'));
    }

    carpeta.archivos.splice(archivoIndex, 1);
    await carpeta.save();

    res.json(formatSuccessResponse('Archivo eliminado exitosamente'));

  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar archivo', [error.message]));
  }
};

module.exports = {
  obtenerCarpetas,
  crearCarpeta,
  obtenerCarpeta,
  actualizarCarpeta,
  eliminarCarpeta,
  compartirCarpeta,
  subirArchivo,
  eliminarArchivo,
  uploadMiddleware: upload.single('archivo')
};
