const Iglesia = require('../models/Iglesia');
const IglesiaMessage = require('../models/IglesiaMessage');
const Meeting = require('../models/Meeting'); // Importar Meeting para conteo global
const UserV2 = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');

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
  try {
    const { nombre, ubicacion, denominacion, descripcion, contacto, reuniones } = req.body;

    // Validar campos requeridos básicos
    if (!nombre || !ubicacion || !ubicacion.pais || !ubicacion.ciudad) {
      return res.status(400).json(formatErrorResponse('Nombre y ubicación (país, ciudad) son obligatorios'));
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
    console.error('Error al crear iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al crear iglesia', [error.message]));
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

    // Crear notificación para el pastor
    const Notification = require('../models/Notification');
    const nuevaNotificacion = await Notification.create({
      receptor: iglesia.pastorPrincipal._id,
      emisor: req.userId,
      tipo: 'solicitud_iglesia',
      contenido: `${solicitante.nombres.primero} ${solicitante.apellidos.primero} desea unirse a ${iglesia.nombre}`,
      referencia: {
        tipo: 'Iglesia',
        id: iglesia._id
      },
      metadata: {
        iglesiaNombre: iglesia.nombre,
        solicitanteId: req.userId
      }
    });

    // Emitir evento socket al pastor
    const io = req.app.get('io');
    if (io) {
      // 1. Evento específico para la vista de iglesia (recarga lista miembros)
      io.to(`user:${iglesia.pastorPrincipal._id}`).emit('nuevaSolicitudIglesia', {
        iglesiaId: iglesia._id,
        iglesiaNombre: iglesia.nombre,
        solicitante: {
          _id: req.userId,
          nombres: solicitante.nombres,
          apellidos: solicitante.apellidos
        }
      });

      // 2. Evento genérico para la campanita de notificaciones (Dropdown)
      try {
        const fullNotification = await Notification.findById(nuevaNotificacion._id)
          .populate('emisor', 'nombres apellidos social.fotoPerfil')
          .populate('receptor', 'nombres apellidos social.fotoPerfil');

        if (fullNotification) {
          // Usar 'notifications:userId' porque es donde el frontend NotificationsDropdown escucha
          io.to(`notifications:${iglesia.pastorPrincipal._id}`).emit('newNotification', fullNotification);
          console.log('🔔 Notificación enviada a socket notifications:', iglesia.pastorPrincipal._id);
        }
      } catch (err) {
        console.error('Error emitiendo newNotification:', err);
      }
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

    // 7. Notificar al Pastor Principal
    const Notification = require('../models/Notification');
    const usuarioNombre = `${user.nombres.primero} ${user.apellidos.primero}`;

    await Notification.create({
      receptor: iglesia.pastorPrincipal,
      emisor: userId,
      tipo: 'miembro_abandono_iglesia',
      contenido: `${usuarioNombre} ha dejado la iglesia.${motivo ? ` Motivo: "${motivo}"` : ''}`,
      referencia: {
        tipo: 'Iglesia',
        id: iglesia._id
      },
      metadata: {
        iglesiaNombre: iglesia.nombre,
        motivo
      }
    });

    // 5. Emitir evento Socket para actualizar listas en tiempo real
    const io = req.app.get('io');
    if (io) {
      // Notificar al pastor (para actualizar lista de miembros)
      io.to(`user:${iglesia.pastorPrincipal}`).emit('miembroSalio', {
        iglesiaId: iglesia._id,
        userId: userId,
        motivo
      });

      // Notificar a notificaciones del pastor
      io.to(`notifications:${iglesia.pastorPrincipal}`).emit('newNotification', {
        // Payload simplificado si no se popula todo
        contenido: `${usuarioNombre} ha dejado la iglesia.`,
        tipo: 'miembro_abandono_iglesia'
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
          const logoUrl = await uploadToR2(req.files.logo[0].buffer, req.files.logo[0].originalname, 'iglesias');
          console.log('✅ [UPDATE IGLESIA] Logo subido a R2:', logoUrl);
          iglesia.logo = logoUrl;
        } catch (uploadError) {
          console.error('❌ [UPDATE IGLESIA] Error al subir logo:', uploadError);
        }
      }
      if (req.files.portada && req.files.portada[0]) {
        console.log('📤 [UPDATE IGLESIA] Subiendo portada a R2...');
        try {
          const portadaUrl = await uploadToR2(req.files.portada[0].buffer, req.files.portada[0].originalname, 'iglesias');
          console.log('✅ [UPDATE IGLESIA] Portada subida a R2:', portadaUrl);
          iglesia.portada = portadaUrl;
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
        const galeriaPromises = req.files.galeria.map(file =>
          uploadToR2(file.buffer, file.originalname, 'iglesias/galeria')
        );
        const newUrls = await Promise.all(galeriaPromises);
        iglesia.galeria = [...iglesia.galeria, ...newUrls];
      } catch (uploadError) {
        console.error('❌ Error subiendo galería:', uploadError);
      }
    }

    // 🎥 Manejo de Multimedia (Fotos y Videos)
    if (req.files && req.files.multimedia && req.files.multimedia.length > 0) {
      console.log('📤 [UPDATE IGLESIA] Subiendo archivos multimedia...');
      try {
        const multimediaPromises = req.files.multimedia.map(async (file) => {
          const url = await uploadToR2(file.buffer, file.originalname, 'iglesias/multimedia');
          const isVideo = file.mimetype.startsWith('video/');
          return {
            url,
            tipo: isVideo ? 'video' : 'image',
            caption: req.body.multimediaCaption || 'Contenido Multimedia',
            fecha: new Date()
          };
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
      const Notification = require('../models/Notification');
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

    // Crear notificación para el solicitante
    const Notification = require('../models/Notification');
    const tipoNotificacion = accion === 'aprobar' ? 'solicitud_iglesia_aprobada' : 'solicitud_iglesia_rechazada';
    const contenido = accion === 'aprobar'
      ? `¡Felicidades! Has sido aceptado como miembro en la iglesia ${iglesia.nombre}.`
      : `Tu solicitud para unirte a la iglesia ${iglesia.nombre} no fue aceptada en esta ocasión.`;

    console.log('🔄 gestionarSolicitud - Creando notificación...');
    const nuevaNotificacion = await Notification.create({
      receptor: userId,
      emisor: req.userId,
      tipo: tipoNotificacion,
      contenido,
      referencia: {
        tipo: 'Iglesia',
        id: iglesia._id
      },
      metadata: {
        iglesiaNombre: iglesia.nombre,
        iglesiaLogo: iglesia.logo, // ✅ Agregar logo para mostrar en notificación
        accion
      }
    });
    console.log('✅ gestionarSolicitud - Notificación creada');

    // Emitir evento socket al solicitante
    const io = req.app.get('io');
    if (io) {
      console.log('🔄 gestionarSolicitud - Emitiendo eventos socket...');
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
        applicantId: userId // ID del usuario cuya solicitud fue procesada
      });

      // ✅ NUEVO: Emitir evento 'newNotification' para que aparezca en la campanita del usuario
      try {
        const fullNotification = await Notification.findById(nuevaNotificacion._id)
          .populate('emisor', 'nombres apellidos social.fotoPerfil')
          .populate('receptor', 'nombres apellidos social.fotoPerfil');

        if (fullNotification) {
          // Usar 'notifications:userId' porque es donde el frontend NotificationsDropdown escucha
          io.to(`notifications:${userId}`).emit('newNotification', fullNotification);
          console.log('🔔 Notificación de respuesta enviada a socket notifications:', userId);
        }
      } catch (err) {
        console.error('Error emitiendo newNotification respuesta:', err);
      }

      console.log('✅ gestionarSolicitud - Eventos socket emitidos');
    } else {
      console.log('⚠️ gestionarSolicitud - Socket.io no disponible');
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

    // Emitir evento Socket.IO (si está configurado)
    const io = req.app.get('io');
    if (io) {
      io.to(`iglesia:${id}`).emit('newIglesiaMessage', newMessage);

      // --- Notificaciones para Miembros ---
      const Notification = require('../models/Notification');

      // Obtener todos los miembros (excepto el emisor) para notificarles
      // Incluimos al pastor principal también si no es el emisor
      const recipientIds = iglesia.miembros.filter(m => m.toString() !== req.userId.toString());
      if (iglesia.pastorPrincipal.toString() !== req.userId.toString() && !recipientIds.includes(iglesia.pastorPrincipal.toString())) {
        recipientIds.push(iglesia.pastorPrincipal.toString());
      }

      const senderName = `${newMessage.author.nombres.primero} ${newMessage.author.apellidos.primero}`;

      // Enviar notificaciones en paralelo (con tope para evitar sobrecarga si hay muchos miembros)
      // Nota: En una app masiva esto iría a una cola (BullMQ/Redis)
      const notifyPromises = recipientIds.map(async (recipientId) => {
        try {
          const notification = await Notification.create({
            receptor: recipientId,
            emisor: req.userId,
            tipo: 'nuevo_mensaje',
            contenido: `${senderName} envió un mensaje en ${iglesia.nombre}`,
            referencia: {
              tipo: 'Iglesia',
              id: iglesia._id
            },
            metadata: {
              iglesiaNombre: iglesia.nombre,
              mensajeId: newMessage._id,
              content: newMessage.content.substring(0, 50)
            }
          });

          // Emitir a la sala de notificaciones del usuario
          io.to(`notifications:${recipientId}`).emit('newNotification', notification);
          // También a la sala de usuario por si acaso (algunos componentes escuchan ahí)
          io.to(`user:${recipientId}`).emit('newNotification', notification);
        } catch (err) {
          console.error(`Error enviando notificación a ${recipientId}:`, err);
        }
      });

      // No esperamos a que todas terminen para responder al cliente, pero las lanzamos
      Promise.all(notifyPromises).catch(e => console.error('Error in batch notifications:', e));
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
  getExMiembros
};
