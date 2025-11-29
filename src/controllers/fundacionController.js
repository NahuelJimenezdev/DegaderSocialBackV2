const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');

/**
 * Solicitar unirse a la Fundación Sol y Luna
 * POST /api/fundacion/solicitar
 */
const solicitarUnirse = async (req, res) => {
  try {
    const userId = req.userId;
    const { nivel, areaFormal, cargoFormal, territorio } = req.body;

    // Validar campos requeridos
    if (!nivel || !areaFormal || !cargoFormal) {
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
      areaFormal,
      cargoFormal,
      territorio: territorio || {},
      estadoAprobacion: 'pendiente',
      fechaIngreso: new Date()
    };

    await user.save();

    res.json(formatSuccessResponse('Solicitud enviada. Espera la aprobación de un superior jerárquico', {
      estadoAprobacion: 'pendiente',
      nivel,
      areaFormal,
      cargoFormal
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

    // Jerarquía de niveles (de mayor a menor)
    const jerarquia = [
      'internacional', 'directivo_general', 'organo_control',
      'nacional', 'regional', 'departamental', 'municipal', 'barrial', 'local'
    ];

    const nivelActual = currentUser.fundacion.nivel;
    const indexNivelActual = jerarquia.indexOf(nivelActual);

    // Obtener niveles que puede aprobar (niveles inferiores)
    const nivelesAprobables = jerarquia.slice(indexNivelActual + 1);

    // Buscar solicitudes pendientes de niveles inferiores
    const solicitudes = await User.find({
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'pendiente',
      'fundacion.nivel': { $in: nivelesAprobables },
      'fundacion.areaFormal': currentUser.fundacion.areaFormal // Misma área
    })
      .select('nombres apellidos email fundacion.nivel fundacion.areaFormal fundacion.cargoFormal fundacion.territorio createdAt')
      .sort({ createdAt: -1 });

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

    // Verificar jerarquía (aprobador debe ser superior)
    const jerarquia = [
      'internacional', 'directivo_general', 'organo_control',
      'nacional', 'regional', 'departamental', 'municipal', 'barrial', 'local'
    ];

    const indexAprobador = jerarquia.indexOf(aprobador.fundacion.nivel);
    const indexSolicitante = jerarquia.indexOf(solicitante.fundacion.nivel);

    if (indexAprobador >= indexSolicitante) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden aprobar'));
    }

    // Verificar misma área
    if (aprobador.fundacion.areaFormal !== solicitante.fundacion.areaFormal) {
      return res.status(403).json(formatErrorResponse('Solo puedes aprobar solicitudes de tu misma área'));
    }

    // Aprobar solicitud
    solicitante.fundacion.estadoAprobacion = 'aprobado';
    solicitante.fundacion.aprobadoPor = aprobadorId;
    solicitante.fundacion.fechaAprobacion = new Date();

    await solicitante.save();

    res.json(formatSuccessResponse('Solicitud aprobada exitosamente', {
      usuario: {
        id: solicitante._id,
        nombreCompleto: solicitante.nombreCompleto,
        nivel: solicitante.fundacion.nivel,
        area: solicitante.fundacion.areaFormal,
        cargo: solicitante.fundacion.cargoFormal
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

    // Verificar jerarquía y área (igual que en aprobar)
    const jerarquia = [
      'internacional', 'directivo_general', 'organo_control',
      'nacional', 'regional', 'departamental', 'municipal', 'barrial', 'local'
    ];

    const indexAprobador = jerarquia.indexOf(aprobador.fundacion.nivel);
    const indexSolicitante = jerarquia.indexOf(solicitante.fundacion.nivel);

    if (indexAprobador >= indexSolicitante) {
      return res.status(403).json(formatErrorResponse('Solo superiores jerárquicos pueden rechazar'));
    }

    if (aprobador.fundacion.areaFormal !== solicitante.fundacion.areaFormal) {
      return res.status(403).json(formatErrorResponse('Solo puedes rechazar solicitudes de tu misma área'));
    }

    // Rechazar solicitud
    solicitante.fundacion.estadoAprobacion = 'rechazado';
    solicitante.fundacion.aprobadoPor = aprobadorId;
    solicitante.fundacion.fechaAprobacion = new Date();
    solicitante.fundacion.motivoRechazo = motivo || 'No especificado';

    await solicitante.save();

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
      area: user.fundacion.areaFormal,
      cargo: user.fundacion.cargoFormal,
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
  obtenerMiEstado
};
