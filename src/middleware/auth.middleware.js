const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Calcular días restantes de suspensión
 */
const calcularDiasRestantes = (fechaFin) => {
  if (!fechaFin) return null; // Suspensión permanente

  const ahora = new Date();
  const fin = new Date(fechaFin);
  const diff = fin - ahora;

  if (diff <= 0) return 0; // Suspensión ya expiró

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Middleware para verificar suspensión con acceso limitado
 */
const checkSuspended = (req, res, next) => {
  const user = req.user;

  // 1. Bloqueo TOTAL para usuarios eliminados
  if (user.seguridad?.estadoCuenta === 'eliminado') {
    console.log('⛔ checkSuspended - Acceso denegado: Usuario ELIMINADO');
    return res.status(403).json({
      success: false,
      message: 'Cuenta eliminada permanentemente. Contacte a soporte si cree que es un error.',
      accountStatus: 'deleted'
    });
  }

  // 2. Bloqueo PARCIAL para suspendidos/inactivos
  if (user.seguridad?.estadoCuenta === 'suspendido' || user.seguridad?.estadoCuenta === 'inactivo') {
    console.log('⚠️ checkSuspended - Usuario suspendido detectado');
    console.log('⚠️ checkSuspended - URL completa:', req.url);
    console.log('⚠️ checkSuspended - Path:', req.path);
    console.log('⚠️ checkSuspended - OriginalUrl:', req.originalUrl);

    //Rutas permitidas para usuarios suspendidos
    const allowedRoutes = [
      /^\/api\/auth\/logout$/,
      /^\/api\/auth\/me$/,
      /^\/api\/auth\/suspension-info$/,
      /^\/api\/notificaciones$/,
      /^\/api\/notificaciones\/[a-fA-F0-9]{24}$/,  // ID de notificación
      /^\/api\/notificaciones\/[a-fA-F0-9]{24}\/read$/,  // Marcar como leída
      // Rutas de tickets (para apelaciones)
      /^\/api\/tickets$/,  // Crear y listar tickets
      /^\/api\/tickets\/[a-fA-F0-9]{24}$/,  // Ver ticket específico
      /^\/api\/tickets\/[a-fA-F0-9]{24}\/responses$/  // Responder a ticket
    ];

    // Usar req.originalUrl que contiene el path completo
    const urlToCheck = req.originalUrl.split('?')[0]; // Remover query params
    const isAllowed = allowedRoutes.some(pattern => pattern.test(urlToCheck));

    console.log('⚠️ checkSuspended - Checking:', urlToCheck);
    console.log('⚠️ checkSuspended - Is allowed?:', isAllowed);

    if (!isAllowed) {
      console.log(`❌ checkSuspended - Ruta no permitida: ${urlToCheck}`);
      return res.status(403).json({
        success: false,
        message: 'Cuenta suspendida',
        suspended: true,
        suspensionInfo: {
          estado: user.seguridad.estadoCuenta,
          fechaInicio: user.seguridad.fechaSuspension,
          fechaFin: user.seguridad.fechaFinSuspension,
          diasRestantes: calcularDiasRestantes(user.seguridad.fechaFinSuspension),
          isPermanente: !user.seguridad.fechaFinSuspension
        }
      });
    }

    // Marcar request como suspendido para filtros posteriores
    req.userSuspended = true;
    console.log(`✅ checkSuspended - Ruta permitida para usuario suspendido: ${urlToCheck}`);
  }

  next();
};

/**
 * Middleware para verificar el token JWT
 */
const authenticate = async (req, res, next) => {
  try {
    console.log(`🔐 authenticate - Procesando: ${req.method} ${req.originalUrl}`);
    console.log('🔐 authenticate - Headers:', req.headers.authorization ? 'Token presente' : 'NO TOKEN');
    console.log('🔐 authenticate - Content-Type:', req.headers['content-type']);
    console.log('🔐 authenticate - Body:', JSON.stringify(req.body));

    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ authenticate - Token no proporcionado');
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ authenticate - Token decodificado, userId:', decoded.userId);

    // Buscar usuario
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('❌ authenticate - Usuario no encontrado en DB');
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('✅ authenticate - Usuario autenticado:', user._id);
    // Agregar usuario al request
    req.user = user;
    req.userId = user._id;

    // Verificar suspensión con acceso limitado
    return checkSuspended(req, res, next);
  } catch (error) {
    console.log('❌ authenticate - Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al verificar autenticación',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador'
    });
  }
  next();
};

/**
 * Middleware para verificar si el usuario es moderador o administrador
 */
const isModerator = (req, res, next) => {
  if (req.user.rol !== 'admin' && req.user.rol !== 'moderador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de moderador'
    });
  }
  next();
};

/**
 * Middleware opcional - No falla si no hay token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user && (user.seguridad?.estadoCuenta === 'activo' || !user.seguridad?.estadoCuenta)) {
        req.user = user;
        req.userId = user._id;
      }
    }

    next();
  } catch (error) {
    // Continuar sin autenticación
    next();
  }
};

/**
 * Middleware para verificar rol Trust & Safety
 * Permite: moderador o usuarios con permiso moderarContenido
 */
const isTrustAndSafety = (req, res, next) => {
  // Verificar múltiples fuentes de permisos de moderación
  const isModeratorRole = req.user.seguridad?.rolSistema === 'moderador';
  const isFounder = req.user.seguridad?.rolSistema === 'Founder';
  const isFounderEmail = req.user.email === 'founderdegader@degader.org'; // FIX: Acceso por email
  const hasModeratorPermission = req.user.seguridad?.permisos?.moderarContenido === true;
  const hasNewRolField = req.user.rol === 'moderador' || req.user.rol === 'admin';

  // Permitir acceso si cumple cualquiera de estas condiciones
  if (!isModeratorRole && !hasModeratorPermission && !isFounder && !hasNewRolField && !isFounderEmail) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de Trust & Safety'
    });
  }
  next();
};

/**
 * Middleware para verificar rol Founder
 */
const isFounder = (req, res, next) => {
  const isFounderEmail = req.user.email === 'founderdegader@degader.org'; // FIX: Acceso por email
  if (req.user.seguridad?.rolSistema !== 'Founder' && !isFounderEmail) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de Founder'
    });
  }
  next();
};

/**
 * Middleware para verificar si el usuario es Trust & Safety o Founder
 */
const isTrustAndSafetyOrFounder = (req, res, next) => {
  const isModeratorRole = req.user.seguridad?.rolSistema === 'moderador';
  const hasModeratorPermission = req.user.seguridad?.permisos?.moderarContenido === true;
  const isFounderRole = req.user.seguridad?.rolSistema === 'Founder';
  const isFounderEmail = req.user.email === 'founderdegader@degader.org';

  if (!isModeratorRole && !hasModeratorPermission && !isFounderRole && !isFounderEmail) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de moderación'
    });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isModerator,
  optionalAuth,
  isTrustAndSafety,
  isFounder,
  isTrustAndSafetyOrFounder
};
