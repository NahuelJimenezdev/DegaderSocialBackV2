const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const cacheService = require('../services/cache.service');
const logger = require('../config/logger');

/**
 * Calcular días restantes de suspensión
 */
const calcularDiasRestantes = (fechaFin) => {
  if (!fechaFin) return null;
  const ahora = new Date();
  const fin = new Date(fechaFin);
  const diff = fin - ahora;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Middleware para verificar suspensión con acceso limitado
 */
const checkSuspended = (req, res, next) => {
  const user = req.user;

  // 1. Bloqueo TOTAL para usuarios eliminados
  if (user.seguridad?.estadoCuenta === 'eliminado') {
    return res.status(403).json({
      success: false,
      message: 'Cuenta eliminada permanentemente. Contacte a soporte si cree que es un error.',
      accountStatus: 'deleted'
    });
  }

  // 2. Bloqueo PARCIAL para suspendidos/inactivos
  if (user.seguridad?.estadoCuenta === 'suspendido' || user.seguridad?.estadoCuenta === 'inactivo') {
    const allowedRoutes = [
      /^\/api\/auth\/logout$/,
      /^\/api\/auth\/me$/,
      /^\/api\/auth\/suspension-info$/,
      /^\/api\/notificaciones$/,
      /^\/api\/notificaciones\/[a-fA-F0-9]{24}$/,
      /^\/api\/notificaciones\/[a-fA-F0-9]{24}\/read$/,
      /^\/api\/tickets$/,
      /^\/api\/tickets\/[a-fA-F0-9]{24}$/,
      /^\/api\/tickets\/[a-fA-F0-9]{24}\/responses$/
    ];

    const urlToCheck = req.originalUrl.split('?')[0];
    const isAllowed = allowedRoutes.some(pattern => pattern.test(urlToCheck));

    if (!isAllowed) {
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

    req.userSuspended = true;
  }

  next();
};

// Cola de promesas para evitar consultas duplicadas a Mongo (Thundering Herd)
const pendingLoads = new Map();

/**
 * Cargar usuario desde Mongo y guardar en cache.
 * Siempre usa .select('-password -firebase').lean() para mínimo overhead.
 * Implementa deduplicación de consultas simultáneas.
 */
async function loadUserFromMongo(userId) {
  // Si ya hay una consulta en curso para este usuario, esperar a esa
  if (pendingLoads.has(userId)) {
    return pendingLoads.get(userId);
  }

  const loadPromise = (async () => {
    try {
      // PROYECCIÓN MÍNIMA: Solo lo necesario para validar ROL y ESTADO
      // Esto reduce el peso de 23KB a <0.2KB por cada petición de assets/API
      const user = await User.findById(userId)
        .select('seguridad.rolSistema seguridad.estadoCuenta seguridad.suspensionFin email fundacion.nivel fundacion.area fundacion.territorio')
        .lean();

      if (user) {
        // Inyectar virtual 'rol' manualmente para compatibilidad con lean()
        user.id = user._id?.toString() || userId;
        user.rol = user.seguridad?.rolSistema || 'usuario';
        await cacheService.setUser(userId, user);
      }
      return user;
    } finally {
      // Limpiar la promesa de la cola al terminar (éxito o error)
      pendingLoads.delete(userId);
    }
  })();

  pendingLoads.set(userId, loadPromise);
  return loadPromise;
}

/**
 * ============================================================
 * Middleware principal de autenticación — Híbrido JWT + Redis
 * ============================================================
 *
 * Flujo:
 *  1. Verificar JWT
 *  2. Extraer userId + v (version) del payload
 *  3. Buscar en Redis cache (user:{userId})
 *     - HIT válido (versiones coinciden) → req.user = cached → next()
 *     - HIT inválido (versión JWT ≠ cache) → invalidar cache → ir a Mongo
 *     - MISS → ir a Mongo → cachear → next()
 *  4. Fallback: si Redis falla → Mongo directo (auth nunca se rompe)
 *  5. Si Mongo falla → 401
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);

    // 1. Verificar JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expirado' });
      }
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Token inválido: falta userId' });
    }

    const jwtVersion = decoded.v ?? null;

    let user = null;

    // 2. Intentar cache Redis
    try {
      const cached = await cacheService.getUser(userId);

      if (cached) {
        const cacheVersion = cached.__v ?? null;

        /**
         * LÓGICA DE CONSISTENCIA DE VERSIÓN (Anti-Bucle)
         * Si hay mismatch, solo invalidamos y recargamos de DB si el ROL ha cambiado.
         * De lo contrario, usamos el cache (aunque la versión sea mayor en Mongo por un post/foto)
         * para evitar bypass masivo de cache y latencia 504 de Atlas.
         */
        if (jwtVersion !== null && cacheVersion !== null && jwtVersion !== cacheVersion) {
            // Validar que tengamos los campos necesarios antes de comparar
            const roleInJwt = decoded.role;
            const roleInCache = cached.rol || cached.seguridad?.rolSistema;
            const statusInCache = cached.seguridad?.estadoCuenta;

            if (roleInJwt && roleInJwt === roleInCache && statusInCache === 'activo') {
                // Versión distinta pero seguridad idéntica: USAR CACHE (Silent hit)
                user = cached;
            } else {
                // Cambio crítico de seguridad detected: INVALIDAR
                logger.info(`[AUTH-CACHE] ⚠️  Security mismatch for ${userId} (JWT Role: ${roleInJwt} vs Cache: ${roleInCache}) → invalidating`);
                await cacheService.invalidateUser(userId);
                // Forzar carga desde Mongo abajo
            }
        } else {
            // HIT perfecto
            user = cached;
        }
      } else {
        logger.info(`[AUTH-CACHE] ❌ MISS for ${userId} — loading from Mongo`);
      }
    } catch (redisErr) {
      // Redis falla → continuar sin cache (fallback a Mongo)
      logger.warn(`[AUTH-CACHE] Redis error (fallback to Mongo): ${redisErr.message}`);
    }

    // 3. Si no hay usuario del cache, cargar desde Mongo
    if (!user) {
      user = await loadUserFromMongo(userId);

      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      }
    }

    // 4. Asignar al request (misma interfaz que antes)
    req.user = user;
    req.userId = user._id;

    return checkSuspended(req, res, next);

  } catch (error) {
    logger.error(`[AUTH] Error inesperado: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error al verificar autenticación' });
  }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const isAdmin = (req, res, next) => {
  const rol = req.user?.rol || req.user?.seguridad?.rolSistema;
  if (rol !== 'admin' && rol !== 'Founder') {
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
  const rol = req.user?.rol || req.user?.seguridad?.rolSistema;
  if (rol !== 'admin' && rol !== 'Founder' && rol !== 'moderador') {
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
      const userId = decoded.userId;
      if (userId) {
        let user = await cacheService.getUser(userId);
        if (!user) {
          user = await User.findById(userId).select('-password -firebase').lean();
          if (user) await cacheService.setUser(userId, user);
        }
        if (user && (user.seguridad?.estadoCuenta === 'activo' || !user.seguridad?.estadoCuenta)) {
          req.user = user;
          req.userId = user._id;
        }
      }
    }
    next();
  } catch {
    next();
  }
};

/**
 * Middleware para verificar rol Trust & Safety
 */
const isTrustAndSafety = (req, res, next) => {
  const isModeratorRole = req.user.seguridad?.rolSistema === 'moderador';
  const isFounder = req.user.seguridad?.rolSistema === 'Founder';
  const isFounderEmail = req.user.email === 'founderdegader@degadersocial.com';
  const hasModeratorPermission = req.user.seguridad?.permisos?.moderarContenido === true;
  const hasNewRolField = req.user.rol === 'moderador' || req.user.rol === 'admin';

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
  const isFounderEmail = req.user.email === 'founderdegader@degadersocial.com';
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
  const isFounderEmail = req.user.email === 'founderdegader@degadersocial.com';

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
