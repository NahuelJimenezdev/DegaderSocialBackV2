const User = require('../models/User.model');
const notificationService = require('../services/notification.service');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');
const logger = require('../config/logger');

/**
 * Solicitar unirse a la Fundación Sol y Luna
 * POST /api/fundacion/solicitar
 */
const solicitarUnirse = async (req, res) => {
  try {
    const userId = req.userId;
    const { nivel, area, subArea, programa, cargo, territorio } = req.body;

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
      subArea, // Nuevo
      programa, // Nuevo
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
      const Notification = require('../models/Notification.model');
      
      // 0. Buscar Founders para el Fallback
      const founders = await User.find({ 'seguridad.rolSistema': 'Founder' }).select('_id email');

      // 1. Jerarquía Ordenada (de abajo hacia arriba)
      const nivelesOrdenados = [
        "local", "barrial", "municipal",
        "departamental", "regional", "nacional",
        "organismo_internacional", "organo_control", "directivo_general"
      ];

      // Normalizar nivel a minúsculas para evitar errores de índice
      const nivelSolicitante = nivel?.toLowerCase();
      const indexNivelSolicitante = nivelesOrdenados.indexOf(nivelSolicitante);

      if (indexNivelSolicitante === -1) {
        logger.warn(`[Fundación] Nivel desconocido: ${nivel}. No se notificarán superiores.`);
      }

      // 2. Algoritmo de Escalada (Buscar superior inmediato)
      let notificacionEnviada = false;
      const territorioSolicitante = user.fundacion.territorio || {};



      // Iterar hacia arriba buscando el primer nivel que tenga usuarios
      // Solo iterar si el índice es válido (>= 0)
      const startLoop = indexNivelSolicitante >= 0 ? indexNivelSolicitante + 1 : nivelesOrdenados.length; // Si falla index, no entra al loop

      for (let i = startLoop; i < nivelesOrdenados.length; i++) {
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
          query['fundacion.territorio.pais'] = { $regex: new RegExp(`^${territorioSolicitante.pais.trim()}$`, 'i') };
        }

        // Filtros adicionales según el nivel objetivo
        if (nivelObjetivo === 'regional' && territorioSolicitante.region) {
          query['fundacion.territorio.region'] = { $regex: new RegExp(`^${territorioSolicitante.region.trim()}$`, 'i') };
        }
        if (nivelObjetivo === 'departamental' && territorioSolicitante.departamento) {
          query['fundacion.territorio.departamento'] = { $regex: new RegExp(`^${territorioSolicitante.departamento.trim()}$`, 'i') };
        }
        if (nivelObjetivo === 'municipal' && territorioSolicitante.municipio) {
          query['fundacion.territorio.municipio'] = { $regex: new RegExp(`^${territorioSolicitante.municipio.trim()}$`, 'i') };
        }

        // 🔒 REGLA DE NIVEL + TERRITORIO + ÁREA (Nueva restricción crítica)
        // El superior debe ser del MISMO ÁREA (Verticalidad), ignorando prefijos como "Dirección de" o "Coordinación de"
        // Ejemplo: "Coordinación de Salud" encontrará a "Dirección de Salud" porque el núcleo es "Salud"
        const areaCore = area.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();

        // Escapar caracteres especiales para RegExp por seguridad
        const areaRegex = new RegExp(areaCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        query.$or = [
          { 'fundacion.area': { $regex: areaRegex } },
          { 'fundacion.cargo': { $in: ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'] } },
          { 'seguridad.rolSistema': 'Founder' },
          { 'fundacion.nivel': { $in: ['organismo_internacional', 'organo_control', 'directivo_general'] } }
        ];

        // Buscar usuarios en este nivel
        const superiores = await User.find(query).select('_id nombres apellidos fundacion seguridad');

        if (superiores.length > 0) {
          // Notificaciones concurrentes
          const notificationPromises = superiores.map(superior => 
            notificationService.notify({
              receptorId: superior._id,
              emisorId: userId,
              tipo: 'solicitud_fundacion',
              contenido: `${user.nombres?.primero || ''} ${user.apellidos?.primero || ''} solicita unirse a la fundación como ${cargo} en ${area}`,
              referencia: { tipo: 'UserV2', id: user._id },
              metadata: {
                nivel, area, subArea, programa, cargo, territorio
              }
            })
          );

          await Promise.allSettled(notificationPromises);
          notificacionEnviada = true;

          // Detener escalada
          break;
        }
      }

      // Fallback: Notificar al Founder si nadie más recibió
      if (!notificacionEnviada) {
        logger.warn('[Fundación] Sin superiores jerárquicos, escalando al Founder.');

        if (founders.length > 0) {
          const founderPromises = founders.map(founder => 
            notificationService.notify({
              receptorId: founder._id,
              emisorId: userId,
              tipo: 'solicitud_fundacion',
              contenido: `[ESCALADA] Solicitud de ${user.nombres?.primero || ''} (${cargo} - ${nivel}) sin superior inmediato.`,
              metadata: {
                nivel, area, subArea, programa, cargo, territorio,
                esEscalada: true
              }
            })
          );

          await Promise.allSettled(founderPromises);
        }
      }

    } catch (notifError) {
      logger.error(`[Fundación] Error notificaciones: ${notifError.message}`);
      // No fallar la solicitud si falla la notificación
    }

    res.json(formatSuccessResponse('Solicitud enviada. Espera la aprobación de un superior jerárquico', {
      estadoAprobacion: 'pendiente',
      nivel,
      area,
      cargo
    }));
  } catch (error) {
    logger.error(`[Fundación] Error solicitar: ${error.message}`);
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
    // Permitir al Founder listar solicitudes (eliminada restricción de panel global)
    // if (currentUser.seguridad?.rolSistema === 'Founder') {
    //   return res.status(403).json(formatErrorResponse('Founder debe usar el Panel de Monitoreo Global para ver todas las solicitudes'));
    // }

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



    // Construir query de búsqueda
    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'pendiente'
    };

    // Si NO es Founder, aplicar filtros jerárquicos
    if (currentUser.seguridad?.rolSistema !== 'Founder') {
      query['fundacion.nivel'] = { $in: nivelesAprobables };
    }

    // Filtrar por área (ya no necesitamos verificar Founder porque fue excluido arriba)
    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(nivelActual);

    // 🔑 LÓGICA ESPECIAL PARA DIRECTORES GENERALES (PASTOR)
    // Los Directores Generales NO tienen área funcional, gobiernan un territorio completo
    const cargoActual = currentUser.fundacion?.cargo ? currentUser.fundacion.cargo.trim() : '';
    const esDirectorGeneral = ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'].includes(cargoActual);

    if (!esGlobal && !esDirectorGeneral) {
      // Solo filtrar por área si NO es global Y NO es Director General
      query['fundacion.area'] = currentUser.fundacion.area;
    }

    // Filtros adicionales (Regional, Departamental, Municipal)
    if (nivelActual === 'regional') {
      const regionDelDirector = currentUser.fundacion.territorio?.region || '';
      
      if (regionDelDirector) {
        query['$or'] = [
          { 'fundacion.territorio.region': { $regex: new RegExp(`^${regionDelDirector.trim()}$`, 'i') } },
          { 'fundacion.territorio.region': { $exists: false } },
          { 'fundacion.territorio.region': '' },
          { 'fundacion.territorio.region': null }
        ];
      }
    }
    if (nivelActual === 'departamental' && currentUser.fundacion.territorio?.departamento) {
      query['fundacion.territorio.departamento'] = { $regex: new RegExp(`^${currentUser.fundacion.territorio.departamento.trim()}$`, 'i') };
    }
    if (nivelActual === 'municipal' && currentUser.fundacion.territorio?.municipio) {
      query['fundacion.territorio.municipio'] = { $regex: new RegExp(`^${currentUser.fundacion.territorio.municipio.trim()}$`, 'i') };
    }



    // Buscar solicitudes pendientes
    const solicitudes = await User.find(query)
      .select('nombres apellidos email fundacion.nivel fundacion.area fundacion.subArea fundacion.programa fundacion.cargo fundacion.territorio createdAt')
      .sort({ createdAt: -1 });



    res.json(formatSuccessResponse('Solicitudes pendientes obtenidas', {
      total: solicitudes.length,
      solicitudes
    }));
  } catch (error) {
    logger.error(`[Fundación] Error listar solicitudes: ${error.message}`);
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
    if (!aprobador) {
      return res.status(404).json(formatErrorResponse('Aprobador no encontrado'));
    }

    const esFounder = aprobador.seguridad?.rolSistema === 'Founder' || aprobador.email === 'founderdegader@degadersocial.com';

    // Si no es Founder, debe ser miembro aprobado de la fundación
    if (!esFounder && (!aprobador.esMiembroFundacion || aprobador.fundacion?.estadoAprobacion !== 'aprobado')) {
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

    const indexSolicitante = nivelesOrdenados.indexOf(solicitante.fundacion.nivel?.toLowerCase());

    // Si el aprobador es Founder, tiene el nivel máximo posible
    let indexAprobador = esFounder ? 999 : nivelesOrdenados.indexOf(aprobador.fundacion?.nivel?.toLowerCase());



    // Debe ser estrictamente superior (índice mayor)
    if (indexAprobador <= indexSolicitante && !esFounder) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden aprobar'));
    }

    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(aprobador.fundacion?.nivel?.toLowerCase()) || esFounder;

    // 🔑 LÓGICA ESPECIAL PARA DIRECTORES GENERALES (PASTOR)
    const cargoAprobador = aprobador.fundacion?.cargo ? aprobador.fundacion.cargo.trim() : '';
    const esDirectorGeneral = ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'].includes(cargoAprobador);



    // Verificar misma área (con lógica Smart Match para ignorar prefijos) y TERRITORIO (excepto globales/founder)
    if (!esFounder && !esGlobal) {
      // Si llegamos aquí no es Founder ni Global, por lo tanto aprobador.fundacion DEBE existir
      if (!aprobador.fundacion) {
        return res.status(403).json(formatErrorResponse('No tienes perfil de fundación para aprobar'));
      }

      if (!esDirectorGeneral) {
        // Smart Match: Extraer "Núcleo" del área (ej. "Salud" de "Dirección de Salud")
        const areaAprobador = aprobador.fundacion.area || "";
        const areaSolicitante = solicitante.fundacion?.area || "";

        const areaAprobadorCore = areaAprobador.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();
        const areaSolicitanteCore = areaSolicitante.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();

        // Comparar núcleos (Case Insensitive)
        if (areaAprobadorCore.toLowerCase() !== areaSolicitanteCore.toLowerCase()) {
          return res.status(403).json(formatErrorResponse('Solo puedes aprobar solicitudes de tu misma área'));
        }
      }

      // 🔒 VALIDACIÓN TERRITORIAL ESTRICTA
      const paisAprobador = aprobador.fundacion.territorio?.pais;
      const paisSolicitante = solicitante.fundacion.territorio?.pais;

      if (paisAprobador && paisSolicitante && paisAprobador !== paisSolicitante) {
        return res.status(403).json(formatErrorResponse('No tienes jurisdicción en este territorio (País diferente)'));
      }
    }

    // Aprobar solicitud
    solicitante.fundacion.estadoAprobacion = 'aprobado';
    solicitante.fundacion.aprobadoPor = aprobadorId;
    solicitante.fundacion.fechaAprobacion = new Date();
    solicitante.fundacion.activo = true;

    await solicitante.save();

    // ========================================
    // 🔔 CREAR NOTIFICACIÓN PARA EL SOLICITANTE
    // ========================================
    // 🏆 Notificación V1 PRO
    try {
      const { notificationService } = require('../services/notificationService');
      
      notificationService.notify({
        receptorId: solicitante._id,
        emisorId: aprobadorId,
        tipo: 'solicitud_fundacion_aprobada',
        contenido: `¡Felicidades! Tu solicitud para unirte a la fundación como ${solicitante.fundacion.cargo} ha sido aprobada`,
        metadata: {
          nivel: solicitante.fundacion.nivel,
          area: solicitante.fundacion.area,
          cargo: solicitante.fundacion.cargo,
          aprobadoPor: aprobador.nombreCompleto || `${aprobador.nombres?.primero || ''} ${aprobador.apellidos?.primero || ''}`
        }
      }).catch(err => logger.error(`[Fundación] Error notification: ${err.message}`));

      // 📡 BROADCAST: Actualizar listas en tiempo real
      const io = req.app.get('io');
      if (io) {
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
              activo: true,
              fechaAprobacion: solicitante.fundacion.fechaAprobacion,
              aprobadoPor: aprobadorId
            }
          }
        });
      }
    } catch (notifError) {
      logger.error(`[Fundación] Error notif aprobación: ${notifError.message}`);
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
    logger.error(`[Fundación] Error aprobar: ${error.message}`);
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
    if (!aprobador) {
      return res.status(404).json(formatErrorResponse('Aprobador no encontrado'));
    }

    const esFounder = aprobador.seguridad?.rolSistema === 'Founder' || aprobador.email === 'founderdegader@degadersocial.com';

    // Si no es Founder, debe ser miembro aprobado de la fundación
    if (!esFounder && (!aprobador.esMiembroFundacion || aprobador.fundacion?.estadoAprobacion !== 'aprobado')) {
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

    const indexSolicitante = nivelesOrdenados.indexOf(solicitante.fundacion.nivel?.toLowerCase());

    // Si el aprobador es Founder, tiene el nivel máximo posible
    let indexAprobador = esFounder ? 999 : nivelesOrdenados.indexOf(aprobador.fundacion?.nivel?.toLowerCase());



    if (indexAprobador <= indexSolicitante && !esFounder) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden rechazar'));
    }

    const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
    const esGlobal = nivelesGlobales.includes(aprobador.fundacion?.nivel?.toLowerCase()) || esFounder;

    // 🔑 LÓGICA ESPECIAL PARA DIRECTORES GENERALES (PASTOR)
    const cargoAprobador = aprobador.fundacion?.cargo ? aprobador.fundacion.cargo.trim() : '';
    const esDirectorGeneral = ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'].includes(cargoAprobador);



    if (!esFounder && !esGlobal) {
      // Si llegamos aquí no es Founder ni Global, por lo tanto aprobador.fundacion DEBE existir
      if (!aprobador.fundacion) {
        return res.status(403).json(formatErrorResponse('No tienes perfil de fundación para rechazar'));
      }

      // Verificar misma área (Smart Match) y TERRITORIO (excepto globales/founder)
      if (!esDirectorGeneral) {
        // Smart Match: Extraer "Núcleo" del área
        const areaAprobador = aprobador.fundacion.area || "";
        const areaSolicitante = solicitante.fundacion?.area || "";

        const areaAprobadorCore = areaAprobador.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();
        const areaSolicitanteCore = areaSolicitante.replace(/^(Dirección de |Coordinación de |Gerencia de |Jefatura de )/i, '').trim();

        // Comparar núcleos (Case Insensitive)
        if (areaAprobadorCore.toLowerCase() !== areaSolicitanteCore.toLowerCase()) {
          return res.status(403).json(formatErrorResponse('Solo puedes rechazar solicitudes de tu misma área'));
        }
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
    // 🏆 Notificación V1 PRO
    try {
      notificationService.notify({
        receptorId: solicitante._id,
        emisorId: aprobadorId,
        tipo: 'solicitud_fundacion_rechazada',
        contenido: `Tu solicitud para unirte a la fundación como ${solicitante.fundacion.cargo} no fue aceptada. Motivo: ${solicitante.fundacion.motivoRechazo}`,
        metadata: {
          nivel: solicitante.fundacion.nivel,
          area: solicitante.fundacion.area,
          cargo: solicitante.fundacion.cargo,
          motivo: solicitante.fundacion.motivoRechazo
        }
      }).catch(err => logger.error(`[Fundación] Error notification rechazo: ${err.message}`));

      // 📡 BROADCAST: Actualizar listas en tiempo real
      const io = req.app.get('io');
      if (io) {
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
      }
    } catch (notifError) {
      logger.error(`[Fundación] Error notif rechazo: ${notifError.message}`);
    }

    res.json(formatSuccessResponse('Solicitud rechazada', {
      usuario: {
        id: solicitante._id,
        nombreCompleto: solicitante.nombreCompleto
      },
      motivo: solicitante.fundacion.motivoRechazo
    }));
  } catch (error) {
    logger.error(`[Fundación] Error rechazar: ${error.message}`);
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
    logger.error(`[Fundación] Error obtener solicitudes: ${error.message}`);
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
    logger.error(`[Fundación] Error obtener estado: ${error.message}`);
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
