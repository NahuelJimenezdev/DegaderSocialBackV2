const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');

/**
 * Solicitar unirse a la Fundación Sol y Luna
 * POST /api/fundacion/solicitar
 */
const solicitarUnirse = async (req, res) => {
  try {
    const userId = req.userId;
    const { nivel, area, cargo, territorio } = req.body;

    // Validar campos requeridos
    if (!nivel || !area || !cargo) {
      return res.status(400).json(formatErrorResponse('Nivel, área y cargo son obligatorios'));
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Verificar si ya es miembro
    if (user.esMiembroFundacion && user.fundacion?.estadoAprobacion === 'aprobado') {
      return res.status(400).json(formatErrorResponse('Ya eres miembro aprobado de la fundación'));
    }

    // Actualizar perfil de fundación
    user.esMiembroFundacion = true;
    user.fundacion = {
      activo: true,
      nivel,
      area,
      cargo,
      territorio: territorio || {},
      estadoAprobacion: 'pendiente',
      fechaIngreso: new Date()
    };

    await user.save();

    // ========================================
    // 🔔 CREAR NOTIFICACIONES PARA SUPERIORES JERÁRQUICOS
    // ========================================
    try {
      const Notification = require('../models/Notification');

      // 1. Jerarquía Ordenada (de abajo hacia arriba)
      const nivelesOrdenados = [
        "local", "barrial", "municipal",
        "departamental", "regional", "nacional",
        "organismo_internacional", "organo_control", "directivo_general"
      ];

      const nivelSolicitante = nivel;
      const indexNivelSolicitante = nivelesOrdenados.indexOf(nivelSolicitante);

      // 2. Algoritmo de Escalada (Buscar superior inmediato)
      let notificacionEnviada = false;
      const territorioSolicitante = user.fundacion.territorio || {};

      console.log('🔍 [Fundación] Iniciando búsqueda de superior inmediato...');

      // Iterar hacia arriba buscando el primer nivel que tenga usuarios
      for (let i = indexNivelSolicitante + 1; i < nivelesOrdenados.length; i++) {
        const nivelObjetivo = nivelesOrdenados[i];

        // Construir Query Base (Filtro Territorial Estricto + Nivel)
        const query = {
          esMiembroFundacion: true,
          'fundacion.estadoAprobacion': 'aprobado',
          'fundacion.nivel': nivelObjetivo,
          // 🔒 REGLA DE ORO: SIEMPRE coindice el PAÍS (nadie ve cosas de otros países)
          // Excepto si el nivel objetivo es global internacional (aunque el usuario pidió estricto país, 
          // directivo_general suele ser único. Pero respetaremos la regla: si hay directivo_general, debe tener el mismo país o null si es global conceptual)
          // Para seguridad, forzamos coincidencia de país si el solicitante tiene país definido.
        };

        if (territorioSolicitante.pais) {
          query['fundacion.territorio.pais'] = territorioSolicitante.pais;
        }

        // Filtros adicionales según el nivel objetivo
        if (nivelObjetivo === 'regional' && territorioSolicitante.region) {
          query['fundacion.territorio.region'] = territorioSolicitante.region;
        }
        if (nivelObjetivo === 'departamental' && territorioSolicitante.departamento) {
          query['fundacion.territorio.departamento'] = territorioSolicitante.departamento;
        }
        if (nivelObjetivo === 'municipal' && territorioSolicitante.municipio) {
          query['fundacion.territorio.municipio'] = territorioSolicitante.municipio;
        }

        // Buscar usuarios en este nivel
        const superiores = await User.find(query).select('_id nombres apellidos');

        if (superiores.length > 0) {
          console.log(`✅ [Fundación] Superior encontrado en nivel ${nivelObjetivo}: ${superiores.length} usuarios.`);

          // Crear notificaciones
          const notificaciones = superiores.map(superior => ({
            receptor: superior._id,
            emisor: userId,
            tipo: 'solicitud_fundacion',
            contenido: `${user.nombres.primero} ${user.apellidos.primero} solicita unirse a la fundación como ${cargo} en ${area}`,
            metadata: {
              nivel,
              area,
              cargo,
              territorio
            }
          }));

          await Notification.insertMany(notificaciones);
          notificacionEnviada = true;

          // Emitir eventos Socket.IO
          const io = req.app.get('io');
          if (io) {
            for (const superior of superiores) {
              const notifCompleta = await Notification.findOne({
                receptor: superior._id,
                emisor: userId,
                tipo: 'solicitud_fundacion'
              }).populate('emisor', 'nombres apellidos social.fotoPerfil').sort({ createdAt: -1 });

              if (notifCompleta) {
                io.to(`notifications:${superior._id}`).emit('newNotification', notifCompleta);
              }
            }
          }

          // ✋ DETENER ESCALADA (Ya se notificó al nivel inmediato superior)
          break;
        }
      }

      // 3. Fallback: Notificar al Founder si nadie más recibió
      if (!notificacionEnviada) {
        console.warn('⚠️ [Fundación] No se encontraron superiores jerárquicos en la cadena.');
        console.log('🚨 Escalando notificación directamente al Founder.');

        const founders = await User.find({ 'seguridad.rolSistema': 'Founder' }).select('_id');

        if (founders.length > 0) {
          const notificacionesFounder = founders.map(founder => ({
            receptor: founder._id,
            emisor: userId,
            tipo: 'solicitud_fundacion',
            contenido: `[ESCALADA] Solicitud de ${user.nombres.primero} (${cargo} - ${nivel}) sin superior inmediato. Requiere atención.`,
            metadata: {
              nivel,
              area,
              cargo,
              territorio,
              esEscalada: true
            }
          }));

          await Notification.insertMany(notificacionesFounder);

          // Socket IO para Founder
          const io = req.app.get('io');
          if (io) {
            for (const founder of founders) {
              const notif = await Notification.findOne({ receptor: founder._id, emisor: userId, tipo: 'solicitud_fundacion' })
                .populate('emisor', 'nombres apellidos social.fotoPerfil').sort({ createdAt: -1 });
              if (notif) io.to(`notifications:${founder._id}`).emit('newNotification', notif);
            }
          }
          console.log('✅ Notificación escalada al Founder exitosamente.');
        }
      }

    } catch (notifError) {
      console.error('❌ Error creando notificaciones:', notifError);
      // No fallar la solicitud si falla la notificación
    }

    res.json(formatSuccessResponse('Solicitud enviada. Espera la aprobación de un superior jerárquico', {
      estadoAprobacion: 'pendiente',
      nivel,
      area,
      cargo
    }));
  } catch (error) {
    console.error('Error al solicitar unirse a fundación:', error);
    res.status(500).json(formatErrorResponse('Error al procesar solicitud', [error.message]));
  }
};

/**
 * Listar solicitudes pendientes de aprobación
 * GET /api/fundacion/solicitudes
 * Solo para superiores jerárquicos
 */
const listarSolicitudes = async (req, res) => {
  try {
    const userId = req.userId;

    // Obtener usuario actual
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.esMiembroFundacion || currentUser.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos para ver solicitudes'));
    }

    // 🚫 Founder NO debe usar este endpoint - debe usar el Panel de Monitoreo Global
    if (currentUser.seguridad?.rolSistema === 'Founder') {
      return res.status(403).json(formatErrorResponse('Founder debe usar el Panel de Monitoreo Global para ver todas las solicitudes'));
    }

    // 1. Jerarquía Ordenada (de abajo hacia arriba)
    const nivelesOrdenados = [
      "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

    const nivelActual = currentUser.fundacion.nivel;
    const indexNivelActual = nivelesOrdenados.indexOf(nivelActual);

    // Obtener niveles que puede aprobar (niveles inferiores)
    // Al ser orden ascendente, puede aprobar a los que tengan índice MENOR
    const nivelesAprobables = nivelesOrdenados.slice(0, indexNivelActual);

    console.log('🔍 [Fundación] Usuario actual:', {
      id: currentUser._id,
      nivel: nivelActual,
      area: currentUser.fundacion.area,
      rolSistema: currentUser.seguridad?.rolSistema
    });
    console.log('📋 [Fundación] Niveles aprobables:', nivelesAprobables);

    // Construir query de búsqueda
    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'pendiente',
      'fundacion.nivel': { $in: nivelesAprobables }
    };

    // Filtrar por área (ya no necesitamos verificar Founder porque fue excluido arriba)
    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(nivelActual);

    // 🔑 LÓGICA ESPECIAL PARA DIRECTORES GENERALES (PASTOR)
    // Los Directores Generales NO tienen área funcional, gobiernan un territorio completo
    const esDirectorGeneral = currentUser.fundacion.cargo === 'Director General (Pastor)';

    if (!esGlobal && !esDirectorGeneral) {
      // Solo filtrar por área si NO es global Y NO es Director General
      query['fundacion.area'] = currentUser.fundacion.area;
    }

    // 🔒 FILTRO TERRITORIAL ESTRICTO PARA LISTAR
    // Un Director Nacional solo ve solicitudes de SU país
    if (currentUser.fundacion.territorio?.pais) {
      query['fundacion.territorio.pais'] = currentUser.fundacion.territorio.pais;
    }

    // Filtros adicionales (Regional, Departamental, Municipal)
    if (nivelActual === 'regional' && currentUser.fundacion.territorio?.region) {
      query['fundacion.territorio.region'] = currentUser.fundacion.territorio.region;
    }
    if (nivelActual === 'departamental' && currentUser.fundacion.territorio?.departamento) {
      query['fundacion.territorio.departamento'] = currentUser.fundacion.territorio.departamento;
    }
    if (nivelActual === 'municipal' && currentUser.fundacion.territorio?.municipio) {
      query['fundacion.territorio.municipio'] = currentUser.fundacion.territorio.municipio;
    }

    console.log('🔎 [Fundación] Query de búsqueda:', JSON.stringify(query, null, 2));

    // Buscar solicitudes pendientes
    const solicitudes = await User.find(query)
      .select('nombres apellidos email fundacion.nivel fundacion.area fundacion.cargo fundacion.territorio createdAt')
      .sort({ createdAt: -1 });

    console.log(`✅ [Fundación] Solicitudes encontradas: ${solicitudes.length}`);

    res.json(formatSuccessResponse('Solicitudes pendientes obtenidas', {
      total: solicitudes.length,
      solicitudes
    }));
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json(formatErrorResponse('Error al obtener solicitudes', [error.message]));
  }
};

/**
 * Aprobar solicitud de un usuario
 * PUT /api/fundacion/aprobar/:userId
 */
const aprobarSolicitud = async (req, res) => {
  try {
    const aprobadorId = req.userId;
    const { userId } = req.params;

    // Obtener aprobador
    const aprobador = await User.findById(aprobadorId);
    if (!aprobador || !aprobador.esMiembroFundacion || aprobador.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos para aprobar solicitudes'));
    }

    // Obtener solicitante
    const solicitante = await User.findById(userId);
    if (!solicitante) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    if (!solicitante.esMiembroFundacion || solicitante.fundacion?.estadoAprobacion !== 'pendiente') {
      return res.status(400).json(formatErrorResponse('Esta solicitud no está pendiente'));
    }

    // Verificar jerarquía con nueva lista ordenada (de abajo hacia arriba)
    const nivelesOrdenados = [
      "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

    const indexAprobador = nivelesOrdenados.indexOf(aprobador.fundacion.nivel);
    const indexSolicitante = nivelesOrdenados.indexOf(solicitante.fundacion.nivel);

    // Debe ser estrictamente superior (índice mayor)
    if (indexAprobador <= indexSolicitante) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden aprobar'));
    }

    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(aprobador.fundacion.nivel);
    const esFounder = aprobador.seguridad?.rolSistema === 'Founder';

    // Verificar misma área y TERRITORIO (excepto globales/founder)
    if (!esFounder && !esGlobal) {
      if (aprobador.fundacion.area !== solicitante.fundacion.area) {
        return res.status(403).json(formatErrorResponse('Solo puedes aprobar solicitudes de tu misma área'));
      }

      // 🔒 VALIDACIÓN TERRITORIAL ESTRICTA
      const paisAprobador = aprobador.fundacion.territorio?.pais;
      const paisSolicitante = solicitante.fundacion.territorio?.pais;

      if (paisAprobador && paisSolicitante && paisAprobador !== paisSolicitante) {
        return res.status(403).json(formatErrorResponse('No tienes jurisdicción en este territorio (País diferente)'));
      }

      // Validaciones adicionales (Provincia/Municipio) podrían ir aquí si se requiere estrictez total hacia abajo
    }

    // Aprobar solicitud
    solicitante.fundacion.estadoAprobacion = 'aprobado';
    solicitante.fundacion.aprobadoPor = aprobadorId;
    solicitante.fundacion.fechaAprobacion = new Date();

    await solicitante.save();

    // ========================================
    // 🔔 CREAR NOTIFICACIÓN PARA EL SOLICITANTE
    // ========================================
    try {
      const Notification = require('../models/Notification');
      const io = req.app.get('io'); // Declarar io una sola vez

      // 🧹 Limpiar notificación original de solicitud
      const deletedNotifications = await Notification.deleteMany({
        receptor: aprobadorId,
        emisor: solicitante._id,
        tipo: 'solicitud_fundacion'
      });
      console.log('🧹 [Fundación] Notificación original eliminada');

      // 📡 Notificar al aprobador que la notificación fue eliminada
      if (io && deletedNotifications.deletedCount > 0) {
        io.to(`notifications:${aprobadorId}`).emit('notificationDeleted', {
          emisorId: solicitante._id,
          tipo: 'solicitud_fundacion'
        });
        console.log(`📡 Notificación de eliminación enviada a: ${aprobadorId}`);
      }

      // Crear notificación de aprobación
      const nuevaNotificacion = await Notification.create({
        receptor: solicitante._id,
        emisor: aprobadorId,
        tipo: 'solicitud_fundacion_aprobada',
        contenido: `¡Felicidades! Tu solicitud para unirte a la fundación como ${solicitante.fundacion.cargo} ha sido aprobada`,
        metadata: {
          nivel: solicitante.fundacion.nivel,
          area: solicitante.fundacion.area,
          cargo: solicitante.fundacion.cargo,
          aprobadoPor: aprobador.nombreCompleto
        }
      });

      console.log('✅ [Fundación] Notificación de aprobación creada');

      // Emitir evento Socket.IO al solicitante
      if (io) {
        const notifCompleta = await Notification.findById(nuevaNotificacion._id)
          .populate('emisor', 'nombres apellidos social.fotoPerfil');

        if (notifCompleta) {
          io.to(`notifications:${solicitante._id}`).emit('newNotification', notifCompleta);
          console.log(`🔔 Notificación de aprobación enviada a: ${solicitante._id}`);
        }

        // 📡 BROADCAST: Actualizar listas en tiempo real para todos los usuarios conectados
        // Esto actualiza: Solicitudes Pendientes y Panel de Monitoreo Global
        io.emit('fundacion:solicitudActualizada', {
          userId: solicitante._id,
          accion: 'aprobada',
          solicitud: {
            _id: solicitante._id,
            nombres: solicitante.nombres,
            apellidos: solicitante.apellidos,
            email: solicitante.email,
            fundacion: {
              nivel: solicitante.fundacion.nivel,
              area: solicitante.fundacion.area,
              cargo: solicitante.fundacion.cargo,
              territorio: solicitante.fundacion.territorio,
              estadoAprobacion: 'aprobado',
              fechaAprobacion: solicitante.fundacion.fechaAprobacion,
              aprobadoPor: aprobadorId
            }
          }
        });
        console.log('📡 Broadcast enviado: solicitud aprobada');
      }
    } catch (notifError) {
      console.error('❌ Error creando notificación de aprobación:', notifError);
    }

    res.json(formatSuccessResponse('Solicitud aprobada exitosamente', {
      usuario: {
        id: solicitante._id,
        nombreCompleto: solicitante.nombreCompleto,
        nivel: solicitante.fundacion.nivel,
        area: solicitante.fundacion.area,
        cargo: solicitante.fundacion.cargo
      }
    }));
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al aprobar solicitud', [error.message]));
  }
};

/**
 * Rechazar solicitud de un usuario
 * PUT /api/fundacion/rechazar/:userId
 */
const rechazarSolicitud = async (req, res) => {
  try {
    const aprobadorId = req.userId;
    const { userId } = req.params;
    const { motivo } = req.body;

    // Obtener aprobador
    const aprobador = await User.findById(aprobadorId);
    if (!aprobador || !aprobador.esMiembroFundacion || aprobador.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos para rechazar solicitudes'));
    }

    // Obtener solicitante
    const solicitante = await User.findById(userId);
    if (!solicitante) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    if (!solicitante.esMiembroFundacion || solicitante.fundacion?.estadoAprobacion !== 'pendiente') {
      return res.status(400).json(formatErrorResponse('Esta solicitud no está pendiente'));
    }

    // Verificar jerarquía con nueva lista ordenada
    const nivelesOrdenados = [
      "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

    const indexAprobador = nivelesOrdenados.indexOf(aprobador.fundacion.nivel);
    const indexSolicitante = nivelesOrdenados.indexOf(solicitante.fundacion.nivel);

    if (indexAprobador <= indexSolicitante) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden rechazar'));
    }

    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(aprobador.fundacion.nivel);
    const esFounder = aprobador.seguridad?.rolSistema === 'Founder';

    if (!esFounder && !esGlobal) {
      if (aprobador.fundacion.area !== solicitante.fundacion.area) {
        return res.status(403).json(formatErrorResponse('Solo puedes rechazar solicitudes de tu misma área'));
      }
      // 🔒 VALIDACIÓN TERRITORIAL ESTRICTA
      const paisAprobador = aprobador.fundacion.territorio?.pais;
      const paisSolicitante = solicitante.fundacion.territorio?.pais;

      if (paisAprobador && paisSolicitante && paisAprobador !== paisSolicitante) {
        return res.status(403).json(formatErrorResponse('No tienes jurisdicción en este territorio (País diferente)'));
      }
    }

    // Rechazar solicitud
    solicitante.fundacion.estadoAprobacion = 'rechazado';
    solicitante.fundacion.aprobadoPor = aprobadorId;
    solicitante.fundacion.fechaAprobacion = new Date();
    solicitante.fundacion.motivoRechazo = motivo || 'No especificado';

    await solicitante.save();

    // ========================================
    // 🔔 CREAR NOTIFICACIÓN PARA EL SOLICITANTE
    // ========================================
    try {
      const Notification = require('../models/Notification');
      const io = req.app.get('io'); // Declarar io una sola vez

      // 🧹 Limpiar notificación original de solicitud
      const deletedNotifications = await Notification.deleteMany({
        receptor: aprobadorId,
        emisor: solicitante._id,
        tipo: 'solicitud_fundacion'
      });
      console.log('🧹 [Fundación] Notificación original eliminada');

      // 📡 Notificar al aprobador que la notificación fue eliminada
      if (io && deletedNotifications.deletedCount > 0) {
        io.to(`notifications:${aprobadorId}`).emit('notificationDeleted', {
          emisorId: solicitante._id,
          tipo: 'solicitud_fundacion'
        });
        console.log(`📡 Notificación de eliminación enviada a: ${aprobadorId}`);
      }

      // Crear notificación de rechazo
      const nuevaNotificacion = await Notification.create({
        receptor: solicitante._id,
        emisor: aprobadorId,
        tipo: 'solicitud_fundacion_rechazada',
        contenido: `Tu solicitud para unirte a la fundación como ${solicitante.fundacion.cargo} no fue aceptada. Motivo: ${solicitante.fundacion.motivoRechazo}`,
        metadata: {
          nivel: solicitante.fundacion.nivel,
          area: solicitante.fundacion.area,
          cargo: solicitante.fundacion.cargo,
          motivo: solicitante.fundacion.motivoRechazo
        }
      });

      console.log('✅ [Fundación] Notificación de rechazo creada');

      // Emitir evento Socket.IO al solicitante
      if (io) {
        const notifCompleta = await Notification.findById(nuevaNotificacion._id)
          .populate('emisor', 'nombres apellidos social.fotoPerfil');

        if (notifCompleta) {
          io.to(`notifications:${solicitante._id}`).emit('newNotification', notifCompleta);
          console.log(`🔔 Notificación de rechazo enviada a: ${solicitante._id}`);
        }

        // 📡 BROADCAST: Actualizar listas en tiempo real para todos los usuarios conectados
        // Esto actualiza: Solicitudes Pendientes y Panel de Monitoreo Global
        io.emit('fundacion:solicitudActualizada', {
          userId: solicitante._id,
          accion: 'rechazada',
          solicitud: {
            _id: solicitante._id,
            nombres: solicitante.nombres,
            apellidos: solicitante.apellidos,
            email: solicitante.email,
            fundacion: {
              nivel: solicitante.fundacion.nivel,
              area: solicitante.fundacion.area,
              cargo: solicitante.fundacion.cargo,
              territorio: solicitante.fundacion.territorio,
              estadoAprobacion: 'rechazado',
              fechaAprobacion: solicitante.fundacion.fechaAprobacion,
              motivoRechazo: solicitante.fundacion.motivoRechazo,
              aprobadoPor: aprobadorId
            }
          }
        });
        console.log('📡 Broadcast enviado: solicitud rechazada');
      }
    } catch (notifError) {
      console.error('❌ Error creando notificación de rechazo:', notifError);
    }

    res.json(formatSuccessResponse('Solicitud rechazada', {
      usuario: {
        id: solicitante._id,
        nombreCompleto: solicitante.nombreCompleto
      },
      motivo: solicitante.fundacion.motivoRechazo
    }));
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json(formatErrorResponse('Error al rechazar solicitud', [error.message]));
  }
};

/**
 * Obtener TODAS las solicitudes de fundación (Solo Founder)
 * GET /api/fundacion/admin/todas-solicitudes
 */
const getAllSolicitudesAdmin = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    // Verificar que el usuario es Founder
    if (!currentUser || currentUser.seguridad?.rolSistema !== 'Founder') {
      return res.status(403).json(formatErrorResponse('Acceso denegado. Solo Founder puede acceder a este endpoint.'));
    }

    // Obtener parámetros de filtro y paginación
    const {
      estado,        // pendiente | aprobado | rechazado
      nivel,         // nacional | regional | departamental | municipal
      pais,          // Argentina | Colombia | etc.
      area,          // nombre del área
      page = 1,
      limit = 20
    } = req.query;

    // Construir query de filtros
    const query = {
      esMiembroFundacion: true
    };

    if (estado) {
      query['fundacion.estadoAprobacion'] = estado;
    }

    if (nivel) {
      query['fundacion.nivel'] = nivel;
    }

    if (pais) {
      query['fundacion.territorio.pais'] = pais;
    }

    if (area) {
      query['fundacion.area'] = area;
    }

    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener solicitudes con paginación
    const solicitudes = await User.find(query)
      .select('nombres apellidos email fundacion createdAt')
      .populate('fundacion.aprobadoPor', 'nombres apellidos')
      .sort({ 'fundacion.fechaIngreso': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await User.countDocuments(query);

    res.json(formatSuccessResponse('Solicitudes obtenidas exitosamente', {
      solicitudes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }));

  } catch (error) {
    console.error('Error al obtener todas las solicitudes:', error);
    res.status(500).json(formatErrorResponse('Error al obtener solicitudes', [error.message]));
  }
};

/**
 * Obtener mi estado en la fundación
 * GET /api/fundacion/mi-estado
 */
const obtenerMiEstado = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .select('esMiembroFundacion fundacion')
      .populate('fundacion.aprobadoPor', 'nombres apellidos');

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    if (!user.esMiembroFundacion) {
      return res.json(formatSuccessResponse('No eres miembro de la fundación', {
        esMiembro: false
      }));
    }

    res.json(formatSuccessResponse('Estado obtenido', {
      esMiembro: true,
      estadoAprobacion: user.fundacion.estadoAprobacion,
      nivel: user.fundacion.nivel,
      area: user.fundacion.area,
      cargo: user.fundacion.cargo,
      territorio: user.fundacion.territorio,
      fechaAprobacion: user.fundacion.fechaAprobacion,
      aprobadoPor: user.fundacion.aprobadoPor,
      motivoRechazo: user.fundacion.motivoRechazo
    }));
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json(formatErrorResponse('Error al obtener estado', [error.message]));
  }
};

module.exports = {
  solicitarUnirse,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  obtenerMiEstado,
  getAllSolicitudesAdmin
};
