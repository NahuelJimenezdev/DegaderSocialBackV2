const Iglesia = require('../models/Iglesia.model');
const IglesiaMessage = require('../models/IglesiaMessage.model');
const Meeting = require('../models/Meeting.model'); // Importar Meeting para conteo global
const UserV2 = require('../models/User.model');
const notificationService = require('../services/notification.service');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');
const imageOptimizationService = require('../services/imageOptimizationService');

/**
 * Crear una nueva iglesia
 * POST /api/iglesias
 */
const calculateDuration = (startDate, endDate = new Date()) => {
  if (!startDate) return 'Tiempo desconocido';

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));

  if (totalDays < 30) return `${totalDays} días`;

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);

  return parts.join(', ') || 'Menos de 1 mes';
};

const crearIglesia = async (req, res) => {
  const { nombre, ubicacion, denominacion, descripcion, contacto, reuniones } = req.body;
  const correlationId = `iglesia-create-${Date.now()}-${req.userId}`;

  try {
    // 1. Validar campos requeridos básicos
    if (!nombre || !ubicacion || !ubicacion.pais || !ubicacion.ciudad) {
      return res.status(400).json(formatErrorResponse('Nombre y ubicación (país, ciudad) son obligatorios'));
    }

    console.log(`[${correlationId}] 🆕 Iniciando creación de iglesia: "${nombre}" para usuario: ${req.userId}`);

    // 2. Verificar si el usuario ya es pastor principal de una iglesia activa (Validación lógica redundante para mejor feedback)
    const iglesiaExistentePastor = await Iglesia.findOne({ 
      pastorPrincipal: req.userId,
      activo: true 
    });

    if (iglesiaExistentePastor) {
      console.warn(`[${correlationId}] ⚠️ Intento de creación duplicada por pastor: ${req.userId}`);
      return res.status(400).json(formatErrorResponse(`Ya tienes una iglesia registrada: "${iglesiaExistentePastor.nombre}". No puedes crear múltiples iglesias.`));
    }

    // 3. Verificar si ya existe una iglesia con el mismo nombre en la misma ciudad (Validación lógica redundante)
    const iglesiaDuplicadaNombre = await Iglesia.findOne({
      nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
      'ubicacion.pais': ubicacion.pais,
      'ubicacion.ciudad': ubicacion.ciudad,
      activo: true
    });

    if (iglesiaDuplicadaNombre) {
      console.warn(`[${correlationId}] ⚠️ Intento de creación con nombre duplicado en ciudad: "${nombre}" en ${ubicacion.ciudad}`);
      return res.status(400).json(formatErrorResponse(`Ya existe una iglesia registrada con el nombre "${nombre}" en ${ubicacion.ciudad}.`));
    }

    const nuevaIglesia = new Iglesia({
      nombre,
      ubicacion,
      denominacion,
      descripcion,
      contacto,
      reuniones,
      pastorPrincipal: req.userId,
      miembros: [req.userId] // El creador es el primer miembro
    });

    await nuevaIglesia.save();

    console.log(`[${correlationId}] ✅ Iglesia creada exitosamente ID: ${nuevaIglesia._id}`);

    // Actualizar usuario para indicar que es miembro de iglesia
    await UserV2.findByIdAndUpdate(req.userId, {
      esMiembroIglesia: true,
      eclesiastico: {
        activo: true,
        iglesia: nuevaIglesia._id,
        rolPrincipal: 'pastor_principal'
      }
    });

    res.status(201).json(formatSuccessResponse('Iglesia creada exitosamente', nuevaIglesia));
  } catch (error) {
    // 4. Manejo específico de errores de MongoDB (E11000 - Llave duplicada)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`[${correlationId}] ❌ Error de llave duplicada en DB: ${field}`, error.keyValue);

      let message = 'Esta iglesia ya se encuentra registrada.';
      if (field === 'pastorPrincipal') {
        message = 'Ya eres pastor principal de otra iglesia.';
      }

      return res.status(409).json(formatErrorResponse(message));
    }

    console.error(`[${correlationId}] ❌ Error crítico al crear iglesia:`, error);
    res.status(500).json(formatErrorResponse('Error interno al procesar la creación de la iglesia', [error.message]));
  }
};

/**
 * Obtener iglesias (Buscador)
 * GET /api/iglesias
 */
const obtenerIglesias = async (req, res) => {
  try {
    console.log('🔍 [obtenerIglesias] Query params:', req.query);
    const { q, pais, ciudad } = req.query;
    const query = { activo: true };

    if (q) {
      query.nombre = new RegExp(q, 'i');
    }
    if (pais) {
      query['ubicacion.pais'] = pais;
    }
    if (ciudad) {
      query['ubicacion.ciudad'] = ciudad;
    }

    console.log('🔍 [obtenerIglesias] MongoDB query:', JSON.stringify(query));

    const iglesias = await Iglesia.find(query)
      .select('nombre ubicacion denominacion descripcion logo portada pastorPrincipal miembros solicitudes reuniones galeria')
      .populate('miembros', 'nombres apellidos social.fotoPerfil social.username email eclesiastico')
      .limit(20)
      .lean(); // Usar lean() para mejor performance

    console.log('✅ [obtenerIglesias] Found', iglesias.length, 'iglesias');
    res.json(formatSuccessResponse('Iglesias encontradas', iglesias));
  } catch (error) {
    console.error('❌ [obtenerIglesias] Error:', error);
    console.error('❌ [obtenerIglesias] Error stack:', error.stack);
    res.status(500).json(formatErrorResponse('Error al buscar iglesias', [error.message]));
  }
};

/**
 * Obtener detalle de iglesia
 * GET /api/iglesias/:id
 */
const obtenerIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const iglesia = await Iglesia.findById(id)
      .populate('pastorPrincipal', 'nombres apellidos social.fotoPerfil social.username email eclesiastico')
      .populate('miembros', 'nombres apellidos social.fotoPerfil social.username email eclesiastico')
      .populate('solicitudes.usuario', 'nombres apellidos social.fotoPerfil');

    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    res.json(formatSuccessResponse('Detalle de iglesia', iglesia));
  } catch (error) {
    console.error('Error al obtener iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al obtener iglesia', [error.message]));
  }
};

/**
 * Solicitar unirse a una iglesia
 * POST /api/iglesias/:id/join
 */
const unirseIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;

    const iglesia = await Iglesia.findById(id).populate('pastorPrincipal', 'nombres apellidos');
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    // Verificar si ya es miembro
    if (iglesia.miembros.includes(req.userId)) {
      return res.status(400).json(formatErrorResponse('Ya eres miembro de esta iglesia'));
    }

    // Verificar si ya hay solicitud pendiente
    const solicitudExistente = iglesia.solicitudes.find(s => s.usuario.toString() === req.userId);
    if (solicitudExistente) {
      return res.status(400).json(formatErrorResponse('Ya tienes una solicitud pendiente'));
    }

    iglesia.solicitudes.push({
      usuario: req.userId,
      mensaje,
      fecha: new Date()
    });

    await iglesia.save();

    // Obtener datos del solicitante para la notificación
    const solicitante = await UserV2.findById(req.userId).select('nombres apellidos');

    // 🏆 Notificación V1 PRO
    notificationService.notify({
      receptorId: iglesia.pastorPrincipal._id,
      emisorId: req.userId,
      tipo: 'solicitud_iglesia',
      contenido: `${solicitante.nombres.primero} ${solicitante.apellidos.primero} desea unirse a ${iglesia.nombre}`,
      referencia: { tipo: 'Iglesia', id: iglesia._id },
      metadata: { iglesiaNombre: iglesia.nombre, solicitanteId: req.userId }
    }).catch(err => console.error('⚠️ [Iglesia] Error notification:', err.message));

    // Emitir evento socket al pastor
    const io = req.app.get('io');
    if (io) {
      // Evento específico para la vista de iglesia (recarga lista miembros)
      io.to(`user:${iglesia.pastorPrincipal._id}`).emit('nuevaSolicitudIglesia', {
        iglesiaId: iglesia._id,
        iglesiaNombre: iglesia.nombre,
        solicitante: {
          _id: req.userId,
          nombres: solicitante.nombres,
          apellidos: solicitante.apellidos
        }
      });
    }

    // Devolver iglesia actualizada
    const iglesiaActualizada = await Iglesia.findById(id)
      .select('nombre ubicacion denominacion descripcion logo portada pastorPrincipal miembros solicitudes reuniones')
      .populate('miembros', 'nombres apellidos social.fotoPerfil');

    res.json(formatSuccessResponse('Solicitud enviada exitosamente', iglesiaActualizada));
  } catch (error) {
    console.error('Error al unirse a iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al unirse a iglesia', [error.message]));
  }
};

/**
 * Salir de una iglesia (Abandonar membresía)
 * POST /api/iglesias/:id/leave
 */
const leaveIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body; // Motivo opcional del usuario
    const userId = req.userId;

    console.log(`🚪 [LEAVE IGLESIA] Usuario ${userId} intenta salir de iglesia ${id}`);

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    // Verificar si es miembro
    if (!iglesia.miembros.includes(userId)) {
      return res.status(400).json(formatErrorResponse('No eres miembro de esta iglesia'));
    }

    // Verificar que NO sea el pastor principal (El pastor no puede abandonar su propia iglesia así nomás, debería transferirla o borrarla)
    if (iglesia.pastorPrincipal.toString() === userId.toString()) {
      return res.status(400).json(formatErrorResponse('El pastor principal no puede abandonar la iglesia. Debes transferir el liderazgo o eliminar la iglesia.'));
    }

    // 3. Obtener usuario para calcular historial (antes de borrar)
    const user = await UserV2.findById(userId);
    if (!user) return res.status(404).json(formatErrorResponse('Usuario no encontrado'));

    // Calcular datos históricos
    // Calcular datos históricos
    const fechaUnion = user.eclesiastico?.fechaUnion || user.createdAt;
    const tiempoMembresia = calculateDuration(fechaUnion);

    // Capturar historial existente y sumar roles activos actuales antes de borrar
    let historialRoles = [...(user.eclesiastico?.historialRoles || [])];

    // Agregar rol principal actual si no es 'miembro'
    if (user.eclesiastico?.rolPrincipal && user.eclesiastico.rolPrincipal !== 'miembro') {
      historialRoles.push({
        rol: user.eclesiastico.rolPrincipal,
        fechaInicio: fechaUnion, // Asumimos fecha unión si no hay específica, o podría ser hoy
        fechaFin: new Date()
      });
    }

    // Agregar ministerios activos como roles en el historial
    if (user.eclesiastico?.ministerios?.length > 0) {
      user.eclesiastico.ministerios.forEach(min => {
        if (min.activo) {
          historialRoles.push({
            rol: `${min.cargo || 'Miembro'} de ${min.nombre}`,
            fechaInicio: min.fechaInicio || fechaUnion,
            fechaFin: new Date()
          });
        }
      });
    }

    // 4. Registrar en historial de salidas
    iglesia.historialSalidas.push({
      usuario: userId,
      fechaSalida: new Date(),
      motivo: motivo || 'Sin motivo especificado',
      rolAlSalir: user.eclesiastico?.rolPrincipal || 'miembro',
      fechaUnion: fechaUnion,
      tiempoMembresia: tiempoMembresia,
      historialRoles: historialRoles
    });

    console.log('📝 Registrando salida:', iglesia.historialSalidas[iglesia.historialSalidas.length - 1]);

    // 5. Eliminar de la lista de miembros de la iglesia
    iglesia.miembros = iglesia.miembros.filter(m => m.toString() !== userId.toString());

    // Guardar cambios en la iglesia (historial + eliminación)
    await iglesia.save();
    console.log('✅ Iglesia guardada con historial actualizado');

    // 6. Actualizar el perfil del usuario (quitar membresía)
    await UserV2.findByIdAndUpdate(userId, {
      esMiembroIglesia: false,
      eclesiastico: {
        activo: false,
        iglesia: null,
        rolPrincipal: 'miembro',
        ministerios: [],
        historialRoles: []
      }
    });

    // 🏆 Notificación V1 PRO
    const usuarioNombre = `${user.nombres.primero} ${user.apellidos.primero}`;
    notificationService.notify({
      receptorId: iglesia.pastorPrincipal,
      emisorId: userId,
      tipo: 'miembro_abandono_iglesia',
      contenido: `${usuarioNombre} ha dejado la iglesia.${motivo ? ` Motivo: "${motivo}"` : ''}`,
      referencia: { tipo: 'Iglesia', id: iglesia._id },
      metadata: { iglesiaNombre: iglesia.nombre, motivo }
    }).catch(err => console.error('⚠️ [Iglesia] Error notification leave:', err.message));

    // Emitir evento Socket para actualizar listas en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${iglesia.pastorPrincipal}`).emit('miembroSalio', {
        iglesiaId: iglesia._id,
        userId: userId,
        motivo
      });
    }

    res.json(formatSuccessResponse('Has abandonado la iglesia exitosamente', { userId }));

  } catch (error) {
    console.error('❌ Error al salir de la iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al procesar la salida de la iglesia', [error.message]));
  }
};

/**
 * Obtener historial de ex-miembros
 * GET /api/iglesias/:id/ex-miembros
 */
const getExMiembros = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const iglesia = await Iglesia.findById(id)
      .select('historialSalidas pastorPrincipal')
      .populate({
        path: 'historialSalidas.usuario',
        select: 'nombres apellidos social.fotoPerfil email'
      });

    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    console.log('📊 [DEBUG] getExMiembros - Historial encontrado:', iglesia.historialSalidas);

    // Verificar permisos: Solo pastor principal o admin de iglesia pueden ver esto
    // Por ahora validamos solo pastor principal para ser estrictos como pidió el usuario
    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para ver este historial'));
    }

    // Ordenar por fecha de salida descendente (más reciente primero)
    const historialOrdenado = iglesia.historialSalidas.sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida));

    res.json(formatSuccessResponse('Historial de ex-miembros obtenido', historialOrdenado));
  } catch (error) {
    console.error('❌ Error al obtener ex-miembros:', error);
    res.status(500).json(formatErrorResponse('Error al obtener historial de salidas', [error.message]));
  }
};

/**
 * Actualizar datos de iglesia
 * PUT /api/iglesias/:id
 */
const updateIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = req.body;

    console.log('🔄 updateIglesia - ID:', id);
    console.log('📦 updateIglesia - Body:', JSON.stringify(updateData, null, 2));
    console.log('📂 updateIglesia - Files:', req.files);

    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    // Verificar que el usuario sea el pastor principal
    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('Solo el pastor principal puede editar la iglesia'));
    }

    // Parsear campos JSON si vienen como strings (desde FormData)
    try {
      if (typeof updateData.ubicacion === 'string') updateData.ubicacion = JSON.parse(updateData.ubicacion);
      if (typeof updateData.contacto === 'string') updateData.contacto = JSON.parse(updateData.contacto);
      if (typeof updateData.horarios === 'string') updateData.horarios = JSON.parse(updateData.horarios);
      if (typeof updateData.galeria === 'string') updateData.galeria = JSON.parse(updateData.galeria);
    } catch (parseError) {
      console.error('❌ Error parsing JSON fields:', parseError);
    }

    // Manejar archivos subidos a R2
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        console.log('📤 [UPDATE IGLESIA] Subiendo logo a R2...');
        try {
          const optimizedLogo = await imageOptimizationService.processAndUploadImage(req.files.logo[0].buffer, req.files.logo[0].originalname, 'iglesias');
          console.log('✅ [UPDATE IGLESIA] Logo subido a R2:', optimizedLogo.url);
          iglesia.logo = optimizedLogo.url;
          iglesia.logoObj = optimizedLogo;
        } catch (uploadError) {
          console.error('❌ [UPDATE IGLESIA] Error al subir logo:', uploadError);
        }
      }
      if (req.files.portada && req.files.portada[0]) {
        console.log('📤 [UPDATE IGLESIA] Subiendo portada a R2...');
        try {
          const optimizedPortada = await imageOptimizationService.processAndUploadImage(req.files.portada[0].buffer, req.files.portada[0].originalname, 'iglesias');
          console.log('✅ [UPDATE IGLESIA] Portada subida a R2:', optimizedPortada.url);
          iglesia.portada = optimizedPortada.url;
          iglesia.portadaObj = optimizedPortada;
        } catch (uploadError) {
          console.error('❌ [UPDATE IGLESIA] Error al subir portada:', uploadError);
        }
      }
    }

    // 📸 Manejo de Galería (Independiente para evitar sobrescrituras)
    if (updateData.galeria !== undefined) {
      iglesia.galeria = Array.isArray(updateData.galeria) ? updateData.galeria : [];
    }

    // Manejo de InfoPastor
    if (updateData.infoPastor) {
      if (typeof updateData.infoPastor === 'string') {
        try {
          iglesia.infoPastor = JSON.parse(updateData.infoPastor);
        } catch (e) {
          console.error('Error parsing infoPastor:', e);
        }
      } else {
        iglesia.infoPastor = updateData.infoPastor;
      }
    }

    if (req.files && req.files.galeria && req.files.galeria.length > 0) {
      console.log('📤 [UPDATE IGLESIA] Subiendo fotos nuevas a galería...');
      try {
        const galeriaPromises = req.files.galeria.map(async (file) => {
          return await imageOptimizationService.processAndUploadImage(file.buffer, file.originalname, 'iglesias/galeria');
        });
        const newImages = await Promise.all(galeriaPromises);
        const newUrls = newImages.map(img => img.url || img.large || img.medium || img.small);
        iglesia.galeria = [...(iglesia.galeria || []), ...newUrls].filter(Boolean); // Filter nulls
        if (!iglesia.galeriaObjs) iglesia.galeriaObjs = [];
        iglesia.galeriaObjs = [...iglesia.galeriaObjs, ...newImages];
      } catch (uploadError) {
        console.error('❌ Error subiendo galería:', uploadError);
      }
    }

    // 🎥 Manejo de Multimedia (Fotos y Videos)
    if (req.files && req.files.multimedia && req.files.multimedia.length > 0) {
      console.log('📤 [UPDATE IGLESIA] Subiendo archivos multimedia...');
      try {
        const multimediaPromises = req.files.multimedia.map(async (file) => {
          const isVideo = file.mimetype.startsWith('video/');
          if (isVideo) {
            const url = await uploadToR2(file.buffer, file.originalname, 'iglesias/multimedia');
            return {
              url,
              tipo: 'video',
              caption: req.body.multimediaCaption || 'Contenido Multimedia',
              fecha: new Date()
            };
          } else {
            const optimized = await imageOptimizationService.processAndUploadImage(file.buffer, 'iglesias/multimedia');
            return {
              url: optimized.url,
              small: optimized.small,
              medium: optimized.medium,
              large: optimized.large,
              blurHash: optimized.blurHash,
              tipo: 'image',
              caption: req.body.multimediaCaption || 'Contenido Multimedia',
              fecha: new Date()
            };
          }
        });

        const newMultimedia = await Promise.all(multimediaPromises);
        // Inicializar si no existe (para iglesias viejas)
        if (!iglesia.multimedia) iglesia.multimedia = [];
        iglesia.multimedia = [...iglesia.multimedia, ...newMultimedia];

        console.log(`✅ Agregados ${newMultimedia.length} archivos a multimedia`);
      } catch (uploadError) {
        console.error('❌ Error subiendo multimedia:', uploadError);
      }
    }

    // Actualizar campos permitidos (SIN galeria ni infoPastor que ya se manejaron)
    const allowedFields = ['nombre', 'descripcion', 'mision', 'vision', 'valores', 'ubicacion', 'contacto', 'horarios'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        iglesia[field] = updateData[field];
      }
    });

    const savedIglesia = await iglesia.save();
    console.log('✅ Iglesia saved:', {
      id: savedIglesia._id,
      logo: savedIglesia.logo,
      portada: savedIglesia.portada
    });

    res.json(formatSuccessResponse('Iglesia actualizada exitosamente', savedIglesia));
  } catch (error) {
    console.error('❌ Error al actualizar iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar iglesia', [error.message]));
  }
};

/**
 * Gestionar solicitud (Aprobar/Rechazar)
 * POST /api/iglesias/:id/solicitudes/:userId
 */
const gestionarSolicitud = async (req, res) => {
  try {
    console.log('🚀 gestionarSolicitud - Inicio', { params: req.params, body: req.body, userId: req.userId });
    const { id, userId } = req.params;
    const { accion } = req.body; // 'aprobar' o 'rechazar'

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) {
      console.log('❌ gestionarSolicitud - Iglesia no encontrada');
      return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));
    }

    // Verificar permisos (solo pastor principal)
    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      console.log('❌ gestionarSolicitud - Sin permisos');
      return res.status(403).json(formatErrorResponse('No tienes permisos para gestionar solicitudes'));
    }

    console.log('✅ gestionarSolicitud - Permisos verificados');

    // Remover de solicitudes con logs detallados
    console.log('🔍 UserID a remover:', userId);
    console.log('🔍 Solicitudes antes del filter:', iglesia.solicitudes.map(s => ({
      usuario: s.usuario.toString(),
      fecha: s.fecha
    })));

    iglesia.solicitudes = iglesia.solicitudes.filter(s => {
      const solicitudUserId = s.usuario.toString();
      const targetUserId = userId.toString();
      const shouldKeep = solicitudUserId !== targetUserId;
      console.log(`🔍 Comparando: ${solicitudUserId} !== ${targetUserId} = ${shouldKeep}`);
      return shouldKeep;
    });

    console.log('🔍 Solicitudes después del filter:', iglesia.solicitudes.map(s => ({
      usuario: s.usuario.toString(),
      fecha: s.fecha
    })));

    if (accion === 'aprobar') {
      console.log('🔄 gestionarSolicitud - Aprobando solicitud...');
      iglesia.miembros.push(userId);

      // Actualizar perfil del usuario
      console.log('🔄 gestionarSolicitud - Actualizando perfil usuario:', userId);
      try {
        await UserV2.findByIdAndUpdate(userId, {
          esMiembroIglesia: true,
          eclesiastico: {
            activo: true,
            iglesia: iglesia._id,
            rolPrincipal: 'miembro',
            fechaUnion: new Date(),
            historialRoles: []
          }
        });
        console.log('✅ gestionarSolicitud - Perfil usuario actualizado');
      } catch (err) {
        console.error('❌ gestionarSolicitud - Error actualizando usuario:', err);
        throw err;
      }
    }

    // 🧹 Limpieza: Eliminar la notificación original de solicitud para que no vuelva a aparecer
    try {
      const Notification = require('../models/Notification.model');
      await Notification.deleteMany({
        receptor: req.userId,
        emisor: userId,
        tipo: 'solicitud_iglesia',
        'referencia.id': iglesia._id
      });
      console.log('🧹 gestionarSolicitud - Notificación original eliminada');
    } catch (cleanupErr) {
      console.warn('⚠️ Error limpiando notificación original:', cleanupErr);
    }

    console.log('🔄 gestionarSolicitud - Guardando iglesia...');
    await iglesia.save();
    console.log('✅ gestionarSolicitud - Iglesia guardada');

    // 🏆 Notificación V1 PRO
    const tipoNotificacion = accion === 'aprobar' ? 'solicitud_iglesia_aprobada' : 'solicitud_iglesia_rechazada';
    const contenido = accion === 'aprobar'
      ? `¡Felicidades! Has sido aceptado como miembro en la iglesia ${iglesia.nombre}.`
      : `Tu solicitud para unirte a la iglesia ${iglesia.nombre} no fue aceptada en esta ocasión.`;

    notificationService.notify({
      receptorId: userId,
      emisorId: req.userId,
      tipo: tipoNotificacion,
      contenido,
      referencia: { tipo: 'Iglesia', id: iglesia._id },
      metadata: { iglesiaNombre: iglesia.nombre, iglesiaLogo: iglesia.logo, accion }
    }).catch(err => console.error('⚠️ [Iglesia] Error notification response:', err.message));

    // Emitir evento socket al solicitante
    const io = req.app.get('io');
    if (io) {
      const eventoSocket = accion === 'aprobar' ? 'solicitudIglesiaAprobada' : 'solicitudIglesiaRechazada';
      io.to(`user:${userId}`).emit(eventoSocket, {
        iglesiaId: iglesia._id,
        iglesiaNombre: iglesia.nombre,
        accion
      });

      // También emitir al pastor para actualizar su contador
      io.to(`user:${req.userId}`).emit('solicitudIglesiaProcesada', {
        iglesiaId: iglesia._id,
        solicitudesPendientes: iglesia.solicitudes.length,
        applicantId: userId
      });
    }

    // Devolver iglesia actualizada
    const iglesiaActualizada = await Iglesia.findById(id)
      .select('nombre ubicacion denominacion descripcion logo portada pastorPrincipal miembros solicitudes reuniones')
      .populate('miembros', 'nombres apellidos social.fotoPerfil');

    res.json(formatSuccessResponse(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`, iglesiaActualizada));
  } catch (error) {
    console.error('❌ gestionarSolicitud - Error CRÍTICO:', error);
    res.status(500).json(formatErrorResponse('Error al gestionar solicitud', [error.message]));
  }
};

/**
 * Cancelar solicitud propia
 * DELETE /api/iglesias/:id/join
 */
const cancelarSolicitud = async (req, res) => {
  try {
    console.log('🚀 cancelarSolicitud - Inicio', { params: req.params, userId: req.userId });
    const { id } = req.params;

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) {
      console.log('❌ cancelarSolicitud - Iglesia no encontrada');
      return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));
    }

    // Verificar que el usuario tenga una solicitud pendiente
    const tieneSolicitud = iglesia.solicitudes.some(s => s.usuario.toString() === req.userId.toString());
    if (!tieneSolicitud) {
      console.log('❌ cancelarSolicitud - No hay solicitud pendiente');
      return res.status(400).json(formatErrorResponse('No tienes una solicitud pendiente en esta iglesia'));
    }

    console.log('✅ cancelarSolicitud - Solicitud encontrada, procediendo a cancelar');

    // Remover solicitud con logs detallados
    console.log('🔍 UserID a remover:', req.userId);
    console.log('🔍 Solicitudes antes del filter:', iglesia.solicitudes.map(s => ({
      usuario: s.usuario.toString(),
      fecha: s.fecha
    })));

    iglesia.solicitudes = iglesia.solicitudes.filter(s => {
      const solicitudUserId = s.usuario.toString();
      const targetUserId = req.userId.toString();
      const shouldKeep = solicitudUserId !== targetUserId;
      console.log(`🔍 Comparando: ${solicitudUserId} !== ${targetUserId} = ${shouldKeep}`);
      return shouldKeep;
    });

    console.log('🔍 Solicitudes después del filter:', iglesia.solicitudes.map(s => ({
      usuario: s.usuario.toString(),
      fecha: s.fecha
    })));

    console.log('🔄 cancelarSolicitud - Guardando iglesia...');
    await iglesia.save();
    console.log('✅ cancelarSolicitud - Iglesia guardada');

    // Emitir evento socket al pastor para actualizar su lista
    const io = req.app.get('io');
    if (io) {
      console.log('🔄 cancelarSolicitud - Emitiendo evento socket al pastor...');
      io.to(`user:${iglesia.pastorPrincipal}`).emit('solicitudIglesiaCancelada', {
        iglesiaId: iglesia._id,
        solicitudesPendientes: iglesia.solicitudes.length,
        userId: req.userId
      });
      console.log('✅ cancelarSolicitud - Evento socket emitido');
    }

    // Devolver iglesia actualizada
    const iglesiaActualizada = await Iglesia.findById(id)
      .select('nombre ubicacion denominacion descripcion logo portada pastorPrincipal miembros solicitudes reuniones')
      .populate('miembros', 'nombres apellidos social.fotoPerfil');

    res.json(formatSuccessResponse('Solicitud cancelada exitosamente', iglesiaActualizada));
  } catch (error) {
    console.error('❌ cancelarSolicitud - Error CRÍTICO:', error);
    res.status(500).json(formatErrorResponse('Error al cancelar solicitud', [error.message]));
  }
};

/**
 * Obtener mensajes del chat
 * GET /api/iglesias/:id/messages
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const query = { iglesia: id, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await IglesiaMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('author', 'nombres apellidos social.fotoPerfil')
      .populate('replyTo', 'content author')
      .populate({
        path: 'replyTo',
        populate: { path: 'author', select: 'nombres apellidos' }
      });

    res.json(formatSuccessResponse('Mensajes obtenidos', messages.reverse()));
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json(formatErrorResponse('Error al obtener mensajes', [error.message]));
  }
};

/**
 * Enviar mensaje
 * POST /api/iglesias/:id/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, replyTo } = req.body;

    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json(formatErrorResponse('El mensaje debe tener contenido o archivos'));
    }

    // Verificar membresía
    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    const esMiembro = iglesia.miembros.includes(req.userId) ||
      iglesia.pastorPrincipal.toString() === req.userId.toString();

    if (!esMiembro) return res.status(403).json(formatErrorResponse('No eres miembro de esta iglesia'));

    const messageData = {
      iglesia: id,
      author: req.userId,
      content: content || '',
      tipo: 'texto',
      files: []
    };

    if (replyTo && isValidObjectId(replyTo)) {
      messageData.replyTo = replyTo;
    }

    // Manejar archivos - Subir a R2
    if (req.files && req.files.length > 0) {
      console.log('📤 [SEND MESSAGE] Subiendo', req.files.length, 'archivos a R2...');
      messageData.tipo = 'archivo';

      const uploadPromises = req.files.map(async (file) => {
        try {
          let isImage = file.mimetype.startsWith('image/');

          if (isImage) {
            const optimized = await imageOptimizationService.processAndUploadImage(file.buffer, 'iglesias/messages');
            console.log('✅ [SEND MESSAGE] Imagen optimizada y subida:', optimized.url);
            return {
              url: optimized.url,
              small: optimized.small,
              medium: optimized.medium,
              large: optimized.large,
              blurHash: optimized.blurHash,
              nombre: file.originalname,
              tipo: file.mimetype,
              tamaño: file.size
            };
          }

          const fileUrl = await uploadToR2(file.buffer, file.originalname, 'iglesias/messages');
          console.log('✅ [SEND MESSAGE] Archivo subido a R2:', fileUrl);
          return {
            url: fileUrl,
            nombre: file.originalname,
            tipo: file.mimetype,
            tamaño: file.size
          };
        } catch (uploadError) {
          console.error('❌ [SEND MESSAGE] Error al subir archivo:', uploadError);
          return null;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      messageData.files = uploadedFiles.filter(f => f !== null);
    }

    const newMessage = new IglesiaMessage(messageData);
    await newMessage.save();

    // Poblar para devolver al cliente
    await newMessage.populate('author', 'nombres apellidos social.fotoPerfil');
    if (newMessage.replyTo) {
      await newMessage.populate({
        path: 'replyTo',
        populate: { path: 'author', select: 'nombres apellidos' }
      });
    }

    // 🏆 Notificaciones V1 PRO (CONCURRENTE)
    const io = req.app.get('io');
    if (io) {
      io.to(`iglesia:${id}`).emit('newIglesiaMessage', newMessage);

      // Obtener todos los miembros (excepto el emisor) para notificarles
      const recipientIds = iglesia.miembros.filter(m => m.toString() !== req.userId.toString());
      if (iglesia.pastorPrincipal.toString() !== req.userId.toString() && !recipientIds.includes(iglesia.pastorPrincipal.toString())) {
        recipientIds.push(iglesia.pastorPrincipal.toString());
      }

      const notifyPromises = recipientIds.map(recipientId => 
        notificationService.notify({
          receptorId: recipientId,
          emisorId: req.userId,
          tipo: 'nuevo_mensaje',
          contenido: `envió un mensaje en ${iglesia.nombre}`,
          referencia: { tipo: 'Iglesia', id: iglesia._id },
          metadata: {
            iglesiaNombre: iglesia.nombre,
            mensajeId: newMessage._id,
            content: newMessage.content.substring(0, 50)
          }
        })
      );

      // No bloqueamos el flujo principal
      Promise.allSettled(notifyPromises).catch(e => console.error('Error in batch church notifications:', e));
    }

    res.status(201).json(formatSuccessResponse('Mensaje enviado', newMessage));
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al enviar mensaje', [error.message]));
  }
};

/**
 * Eliminar mensaje
 * DELETE /api/iglesias/:id/messages/:messageId
 */
const deleteMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const message = await IglesiaMessage.findById(messageId);
    if (!message) return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));

    // Verificar permisos (autor o pastor)
    const iglesia = await Iglesia.findById(id);
    const esAutor = message.author.toString() === req.userId.toString();
    const esPastor = iglesia && iglesia.pastorPrincipal.toString() === req.userId.toString();

    if (!esAutor && !esPastor) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este mensaje'));
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    if (req.app.get('io')) {
      req.app.get('io').to(`iglesia:${id}`).emit('iglesiaMessageDeleted', { iglesiaId: id, messageId });
    }

    res.json(formatSuccessResponse('Mensaje eliminado'));
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar mensaje', [error.message]));
  }
};

/**
 * Reaccionar a mensaje
 * POST /api/iglesias/:id/messages/:messageId/reactions
 */
const reactToMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { emoji } = req.body;

    const message = await IglesiaMessage.findById(messageId);
    if (!message) return res.status(404).json(formatErrorResponse('Mensaje no encontrado'));

    await message.addReaction(req.userId, emoji);

    if (req.app.get('io')) {
      req.app.get('io').to(`iglesia:${id}`).emit('iglesiaMessageReaction', {
        iglesiaId: id,
        messageId,
        reactions: message.reactions
      });
    }

    res.json(formatSuccessResponse('Reacción actualizada', message));
  } catch (error) {
    console.error('Error al reaccionar:', error);
    res.status(500).json(formatErrorResponse('Error al reaccionar', [error.message]));
  }
};

/**
 * Obtener estadísticas globales de la plataforma
 * GET /api/iglesias/stats/global
 */
const getGlobalStats = async (req, res) => {
  try {
    // 1. Total Iglesias Activas
    const totalIglesias = await Iglesia.countDocuments({ activo: true });

    // 2. Total Miembros (Suma de arrays de miembros en iglesias activas)
    // Usamos aggregate para sumar el tamaño del array 'miembros' de todas las iglesias activas
    const miembrosAggregate = await Iglesia.aggregate([
      { $match: { activo: true } },
      { $project: { count: { $size: "$miembros" } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalMiembros = miembrosAggregate.length > 0 ? miembrosAggregate[0].total : 0;

    // 3. Total Eventos (Reuniones futuras/en curso asociadas a una IGLESIA)
    const totalEventos = await Meeting.countDocuments({
      status: { $in: ['upcoming', 'in-progress'] },
      iglesia: { $exists: true, $ne: null }
    });

    res.json(formatSuccessResponse('Estadísticas globales obtenidas', {
      churches: totalIglesias,
      members: totalMiembros,
      events: totalEventos
    }));
  } catch (error) {
    console.error('Error al obtener estadísticas globales:', error);
    res.status(500).json(formatErrorResponse('Error al calcular estadísticas globales', [error.message]));
  }
};

/**
 * Eliminar Iglesia (solo pastor principal)
 * DELETE /api/iglesias/:id
 */
const eliminarIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('Solo el pastor principal puede eliminar la iglesia'));
    }

    // Actualizar todos los miembros
    await UserV2.updateMany(
      { _id: { $in: iglesia.miembros } },
      {
        $set: {
          esMiembroIglesia: false,
          'eclesiastico.activo': false,
          'eclesiastico.iglesia': null,
          'eclesiastico.rolPrincipal': 'miembro',
          'eclesiastico.ministerios': [],
          'eclesiastico.historialRoles': []
        }
      }
    );

    await Iglesia.findByIdAndDelete(id);

    res.json(formatSuccessResponse('Iglesia eliminada exitosamente'));
  } catch (error) {
    console.error('Error al eliminar iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar iglesia', [error.message]));
  }
};

/**
 * Transferir Liderazgo (solo pastor principal)
 * PUT /api/iglesias/:id/transferir-admin
 */
const transferirLiderazgo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoPastorId } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(nuevoPastorId)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('Solo el pastor principal puede transferir el liderazgo'));
    }

    if (!iglesia.miembros.includes(nuevoPastorId)) {
      return res.status(400).json(formatErrorResponse('El nuevo pastor debe ser miembro de la iglesia'));
    }

    // Actualizar pastor anterior
    await UserV2.findByIdAndUpdate(req.userId, {
      'eclesiastico.rolPrincipal': 'miembro'
    });

    // Actualizar nuevo pastor
    await UserV2.findByIdAndUpdate(nuevoPastorId, {
      'eclesiastico.rolPrincipal': 'pastor_principal'
    });

    iglesia.pastorPrincipal = nuevoPastorId;
    await iglesia.save();

    res.json(formatSuccessResponse('Liderazgo transferido exitosamente'));
  } catch (error) {
    console.error('Error al transferir liderazgo:', error);
    res.status(500).json(formatErrorResponse('Error al transferir liderazgo', [error.message]));
  }
};

module.exports = {
  crearIglesia,
  obtenerIglesias,
  obtenerIglesia,
  unirseIglesia,
  updateIglesia,
  gestionarSolicitud,
  cancelarSolicitud,
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage,
  getGlobalStats,
  leaveIglesia,
  getExMiembros,
  eliminarIglesia,
  transferirLiderazgo
};
