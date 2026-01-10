const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Middleware para verificar el token JWT
 */
const authenticate = async (req, res, next) => {
  try {
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

    // Solo bloquear si la cuenta está suspendida o inactiva
    // Los usuarios normales siempre están 'activo'
    // 'pendiente_validacion' solo aplica para miembros de fundación/iglesia que esperan aprobación
    if (user.seguridad?.estadoCuenta === 'suspendido' || user.seguridad?.estadoCuenta === 'inactivo') {
      console.log('❌ authenticate - Usuario suspendido/inactivo');
      return res.status(403).json({
        success: false,
        message: 'Cuenta inactiva o suspendida'
      });
    }

    console.log('✅ authenticate - Usuario autenticado:', user._id);
    // Agregar usuario al request
    req.user = user;
    req.userId = user._id;

    next();
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
  const isModeratorRole = req.user.seguridad?.rolSistema === 'moderador';
  const hasModeratorPermission = req.user.seguridad?.permisos?.moderarContenido === true;

  if (!isModeratorRole && !hasModeratorPermission) {
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
  if (req.user.seguridad?.rolSistema !== 'Founder') {
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

  if (!isModeratorRole && !hasModeratorPermission && !isFounderRole) {
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
