const Folder = require('../models/Folder');
const UserV2 = require('../models/User.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { formatSuccessResponse, formatErrorResponse } = require('../utils/responseFormatter');
const { resolverUsuariosPorJerarquia, obtenerEstructuraJerarquia } = require('../services/jerarquiaResolver');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');

// Configuración de multer para subida de archivos a R2
const storage = multer.memoryStorage();

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
 * Obtener estructura de jerarquía (Areas, Cargos, Niveles)
 * GET /api/folders/jerarquia
 */
const obtenerJerarquia = async (req, res) => {
  try {
    const jerarquia = obtenerEstructuraJerarquia();
    res.json(formatSuccessResponse('Estructura de jerarquía obtenida', jerarquia));
  } catch (error) {
    console.error('Error al obtener jerarquía:', error);
    res.status(500).json(formatErrorResponse('Error al obtener jerarquía', [error.message]));
  }
};

/**
 * Obtener carpetas del usuario con filtros avanzados
 * GET /api/folders
 */
const obtenerCarpetas = async (req, res) => {
  try {
    const { tipo, area, cargo, pais, provincia, ciudad, compartidas, misCarpetas } = req.query;
    const userId = req.userId;

    console.log('📂 [obtenerCarpetas] UserId:', userId, 'Filtros:', req.query);

    // Si se pide explícitamente "mis carpetas", filtramos solo por propietario
    if (misCarpetas === 'true') {
      const carpetas = await Folder.find({ propietario: userId, activa: true })
        .populate('propietario', 'nombres.primero apellidos.primero email social.fotoPerfil')
        .populate('compartidaCon.usuario', 'nombres.primero apellidos.primero email social.fotoPerfil')
        .sort({ ultimaActividad: -1 });

      return res.json(formatSuccessResponse('Mis carpetas obtenidas', { carpetas, total: carpetas.length }));
    }

    // Si se pide explícitamente "compartidas conmigo"
    if (compartidas === 'true') {
      const carpetas = await Folder.find({
        'compartidaCon.usuario': userId,
        activa: true
      })
        .populate('propietario', 'nombres.primero apellidos.primero email social.fotoPerfil')
        .populate('compartidaCon.usuario', 'nombres.primero apellidos.primero email social.fotoPerfil')
        .sort({ ultimaActividad: -1 });

      return res.json(formatSuccessResponse('Carpetas compartidas obtenidas', { carpetas, total: carpetas.length }));
    }

    // Uso del método estático del modelo para lógica general (incluye visibilidad automática)
    let carpetas = await Folder.obtenerCarpetasUsuario(userId, tipo);

    // Aplicar filtros adicionales en memoria (ya que obtenerCarpetasUsuario devuelve documentos)
    if (area) {
      carpetas = carpetas.filter(c => c.visibilidadPorArea?.areas?.includes(area));
    }
    if (cargo) {
      carpetas = carpetas.filter(c => c.visibilidadPorCargo?.cargos?.includes(cargo));
    }
    if (pais) {
      carpetas = carpetas.filter(c => c.visibilidadGeografica?.pais === pais);
    }

    // Paginación manual si fuera necesario, por ahora retornamos todo
    res.json(formatSuccessResponse('Carpetas obtenidas exitosamente', {
      carpetas,
      total: carpetas.length
    }));

  } catch (error) {
    console.error('❌ [obtenerCarpetas] Error:', error);
    res.status(500).json(formatErrorResponse('Error al obtener carpetas', [error.message]));
  }
};

/**
 * Crear nueva carpeta con lógica avanzada de jerarquía
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
      compartirCon, // Array de IDs manuales
      visibilidadPorCargo,
      visibilidadPorArea,
      visibilidadGeografica,
      // Campos para lógica automática
      areaSeleccionada,
      nivelInstitucional,
      pais,
      provincia,
      ciudad,
      compartirAutomaticamente // booleano
    } = req.body;

    const userId = req.userId;

    console.log(`📁 Creando carpeta "${nombre}" para usuario: ${userId}`);

    // Validaciones básicas
    if (!nombre || nombre.trim().length < 3) {
      return res.status(400).json(formatErrorResponse('El nombre debe tener al menos 3 caracteres'));
    }

    // Verificar duplicados
    const carpetaExistente = await Folder.findOne({
      propietario: userId,
      nombre: nombre.trim(),
      activa: true
    });

    if (carpetaExistente) {
      return res.status(400).json(formatErrorResponse('Ya tienes una carpeta con este nombre'));
    }

    // Configuración inicial de la carpeta
    const nuevaCarpeta = new Folder({
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : '',
      propietario: userId,
      tipo: tipo || 'personal',
      color: color || '#3B82F6',
      icono: icono || 'folder',
      compartidaCon: []
    });

    // 1. Lógica de Jerarquía Automática
    let usuariosObjetivo = [];

    if (areaSeleccionada && nivelInstitucional) {
      console.log(`🏢 Resolviendo jerarquía: Área ${areaSeleccionada}, Nivel ${nivelInstitucional}`);

      // Resolver usuarios que coinciden con la jerarquía
      usuariosObjetivo = await resolverUsuariosPorJerarquia({
        area: areaSeleccionada,
        nivel: nivelInstitucional,
        pais,
        provincia,
        ciudad
      });

      console.log(`👥 Usuarios encontrados por jerarquía: ${usuariosObjetivo.length}`);

      // Si se activa "compartir automáticamente", agregarlos a compartidaCon
      if (compartirAutomaticamente && usuariosObjetivo.length > 0) {
        const usuariosParaCompartir = usuariosObjetivo
          .filter(u => u._id.toString() !== userId) // Excluir al creador
          .map(u => ({
            usuario: u._id,
            permisos: 'lectura', // Por defecto lectura
            fechaCompartido: new Date()
          }));

        nuevaCarpeta.compartidaCon.push(...usuariosParaCompartir);
      }

      // Configurar visibilidad automática en el modelo (para futuros usuarios que cumplan la regla)
      // Esto permite que si alguien nuevo entra al cargo, vea la carpeta automáticamente
      nuevaCarpeta.visibilidadPorArea = {
        habilitado: true,
        areas: [areaSeleccionada]
      };

      // Configurar visibilidad geográfica si aplica
      if (pais || provincia || ciudad) {
        nuevaCarpeta.visibilidadGeografica = {
          habilitado: true,
          pais: pais,
          subdivision: provincia,
          ciudad: ciudad
        };
      }

      // Configurar cargos implícitos (opcional, si queremos ser estrictos)
      // Por ahora lo dejamos abierto al área/nivel resuelto
    }

    // 2. Configuración manual de visibilidad (si viene del frontend explícitamente)
    if (visibilidadPorCargo) {
      nuevaCarpeta.visibilidadPorCargo = {
        habilitado: visibilidadPorCargo.habilitado || false,
        cargos: visibilidadPorCargo.cargos || []
      };
    }

    if (visibilidadPorArea && !nuevaCarpeta.visibilidadPorArea.habilitado) {
      nuevaCarpeta.visibilidadPorArea = {
        habilitado: visibilidadPorArea.habilitado || false,
        areas: visibilidadPorArea.areas || []
      };
    }

    if (visibilidadGeografica && !nuevaCarpeta.visibilidadGeografica.habilitado) {
      nuevaCarpeta.visibilidadGeografica = {
        habilitado: visibilidadGeografica.habilitado || false,
        pais: visibilidadGeografica.pais,
        ciudad: visibilidadGeografica.ciudad,
        subdivision: visibilidadGeografica.subdivision
      };
    }

    // 3. Compartir manual (usuarios seleccionados específicamente)
    if (compartirCon && Array.isArray(compartirCon)) {
      const manualShares = compartirCon.map(item => ({
        usuario: item.usuario || item, // Soporta objeto u ID directo
        permisos: item.permisos || 'lectura'
      }));

      // Evitar duplicados si ya se agregaron por jerarquía
      manualShares.forEach(share => {
        const exists = nuevaCarpeta.compartidaCon.find(c => c.usuario.toString() === share.usuario.toString());
        if (!exists) {
          nuevaCarpeta.compartidaCon.push(share);
        }
      });
    }

    await nuevaCarpeta.save();

    // Poblar respuesta
    await nuevaCarpeta.populate('propietario', 'nombres.primero apellidos.primero email social.fotoPerfil fundacion.cargo fundacion.area');
    await nuevaCarpeta.populate('compartidaCon.usuario', 'nombres.primero apellidos.primero email social.fotoPerfil');

    console.log(`✅ Carpeta "${nombre}" creada exitosamente. Compartida con ${nuevaCarpeta.compartidaCon.length} usuarios.`);

    res.status(201).json(formatSuccessResponse('Carpeta creada exitosamente', {
      carpeta: nuevaCarpeta,
      usuariosAfectados: usuariosObjetivo.length
    }));

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
      .populate('propietario', 'nombres.primero apellidos.primero email social.fotoPerfil fundacion.cargo fundacion.area')
      .populate('compartidaCon.usuario', 'nombres.primero apellidos.primero email social.fotoPerfil')
      .populate('archivos.uploadedBy', 'nombres.primero apellidos.primero email social.fotoPerfil');

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

    // Solo el propietario o admin puede editar
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

    // Solo el propietario o admin puede compartir
    if (!await carpeta.tienePermiso(userId, 'admin')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para compartir esta carpeta'));
    }

    // Verificar si ya está compartida con este usuario
    const yaCompartida = carpeta.compartidaCon.find(
      item => item.usuario && item.usuario.toString() === usuarioId.toString()
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

    // Poblar para devolver info completa
    await carpeta.populate('compartidaCon.usuario', 'nombres.primero apellidos.primero email social.fotoPerfil');

    res.json(formatSuccessResponse('Carpeta compartida exitosamente', carpeta));

  } catch (error) {
    console.error('Error al compartir carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al compartir carpeta', [error.message]));
  }
};

/**
 * Compartir carpeta masivamente
 * POST /api/folders/:id/share/bulk
 */
const compartirMasivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarios, permisos } = req.body; // usuarios es array de IDs
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    if (!await carpeta.tienePermiso(userId, 'admin')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para compartir esta carpeta'));
    }

    if (!Array.isArray(usuarios)) {
      return res.status(400).json(formatErrorResponse('Se requiere un array de usuarios'));
    }

    let nuevosCompartidos = 0;

    usuarios.forEach(uid => {
      const yaCompartida = carpeta.compartidaCon.find(
        item => item.usuario.toString() === uid.toString()
      );

      if (yaCompartida) {
        yaCompartida.permisos = permisos || 'lectura';
      } else {
        carpeta.compartidaCon.push({
          usuario: uid,
          permisos: permisos || 'lectura'
        });
        nuevosCompartidos++;
      }
    });

    await carpeta.save();

    res.json(formatSuccessResponse(`Carpeta compartida con ${nuevosCompartidos} nuevos usuarios`, {
      totalCompartidos: carpeta.compartidaCon.length
    }));

  } catch (error) {
    console.error('Error al compartir masivamente:', error);
    res.status(500).json(formatErrorResponse('Error al compartir masivamente', [error.message]));
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

    console.log('📤 [UPLOAD FILE] Carpeta:', id, 'Usuario:', userId);

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

    console.log('📤 [UPLOAD FILE] Subiendo a R2:', req.file.originalname);

    // Subir archivo a Cloudflare R2
    const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, 'folders');

    console.log('✅ [UPLOAD FILE] Archivo subido a R2:', fileUrl);

    // Crear objeto archivo
    const nuevoArchivo = {
      filename: req.file.originalname, // Nombre original
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      tipo: determinarTipoArchivo(req.file.mimetype),
      url: fileUrl, // URL de R2
      uploadedBy: userId,
      uploadedAt: new Date()
    };

    carpeta.archivos.push(nuevoArchivo);
    await carpeta.save();

    console.log(`✅ Archivo "${req.file.originalname}" subido a carpeta "${carpeta.nombre}"`);

    res.status(201).json(formatSuccessResponse('Archivo subido exitosamente', nuevoArchivo));

  } catch (error) {
    console.error('❌ [UPLOAD FILE] Error:', error);
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

    console.log('🗑️ [DELETE FILE] Carpeta:', id, 'Archivo:', fileId);

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Verificar permisos de escritura
    if (!await carpeta.tienePermiso(userId, 'escritura')) {
      return res.status(403).json(formatErrorResponse('No tienes permisos para eliminar archivos de esta carpeta'));
    }

    // Buscar el archivo
    const archivoIndex = carpeta.archivos.findIndex(
      archivo => archivo._id.toString() === fileId
    );

    if (archivoIndex === -1) {
      return res.status(404).json(formatErrorResponse('Archivo no encontrado'));
    }

    const archivo = carpeta.archivos[archivoIndex];

    // Eliminar archivo de R2 si la URL es de R2
    if (archivo.url && archivo.url.includes('r2.dev')) {
      try {
        console.log('🗑️ [DELETE FILE] Eliminando de R2:', archivo.url);
        await deleteFromR2(archivo.url);
        console.log('✅ [DELETE FILE] Archivo eliminado de R2');
      } catch (r2Error) {
        console.error('⚠️ [DELETE FILE] Error al eliminar de R2:', r2Error);
        // Continuar aunque falle el borrado de R2
      }
    }

    // Eliminar metadata
    carpeta.archivos.splice(archivoIndex, 1);
    await carpeta.save();

    console.log('✅ Archivo eliminado exitosamente');
    res.json(formatSuccessResponse('Archivo eliminado exitosamente'));
  } catch (error) {
    console.error('❌ [DELETE FILE] Error:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar archivo', [error.message]));
  }
};

/**
 * Salir de una carpeta compartida (Dejar de seguir)
 * POST /api/folders/:id/leave
 */
const salirDeCarpeta = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const carpeta = await Folder.findById(id);

    if (!carpeta || !carpeta.activa) {
      return res.status(404).json(formatErrorResponse('Carpeta no encontrada'));
    }

    // Verificar si el usuario está en la lista de compartidos
    const index = carpeta.compartidaCon.findIndex(
      item => item.usuario && item.usuario.toString() === userId.toString()
    );

    if (index === -1) {
      return res.status(400).json(formatErrorResponse('No eres parte de esta carpeta compartida'));
    }

    // Remover al usuario de la lista
    carpeta.compartidaCon.splice(index, 1);
    await carpeta.save();

    res.json(formatSuccessResponse('Has salido de la carpeta exitosamente'));

  } catch (error) {
    console.error('Error al salir de carpeta:', error);
    res.status(500).json(formatErrorResponse('Error al salir de carpeta', [error.message]));
  }
};

module.exports = {
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
  uploadMiddleware: upload.single('archivo')
};
