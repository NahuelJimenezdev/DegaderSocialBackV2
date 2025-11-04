const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware para verificar el token JWT
 */
const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: 'No se proporcionó token de autenticación'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    const user = await User.findById(decoded.id);

    if (!user || !user.activo) {
      return res.status(401).json({
        ok: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    // Agregar usuario a la request
    req.user = {
      id: user._id,
      email: user.email,
      rol: user.rol
    };

    next();
  } catch (error) {
    console.error('Error en verifyToken:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        ok: false,
        error: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: 'Token expirado'
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Error al verificar autenticación'
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'No autenticado'
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        error: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

/**
 * Middleware opcional - permite acceso sin token pero lo verifica si existe
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.activo) {
        req.user = {
          id: user._id,
          email: user.email,
          rol: user.rol
        };
      }
    }

    next();
  } catch (error) {
    // Si hay error, simplemente continua sin usuario autenticado
    next();
  }
};

module.exports = {
  verifyToken,
  checkRole,
  optionalAuth
};
