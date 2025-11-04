const rateLimit = require('express-rate-limit');

/**
 * Rate limiter general para la API
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana
  message: {
    ok: false,
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Retorna info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Demasiadas peticiones. Por favor, intenta nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter estricto para autenticación
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 intentos de login
  skipSuccessfulRequests: true, // No contar peticiones exitosas
  message: {
    ok: false,
    error: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo más tarde.'
  },
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter para creación de contenido
 */
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // Límite de 10 creaciones por minuto
  message: {
    ok: false,
    error: 'Estás creando contenido demasiado rápido. Por favor, espera un momento.'
  },
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Límite de creación excedido. Por favor, espera 1 minuto antes de crear más contenido.',
      retryAfter: '1 minuto'
    });
  }
});

/**
 * Rate limiter para mensajes
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 mensajes por minuto
  message: {
    ok: false,
    error: 'Estás enviando mensajes demasiado rápido.'
  },
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Límite de mensajes excedido. Por favor, espera un momento.',
      retryAfter: '1 minuto'
    });
  }
});

/**
 * Rate limiter para búsquedas
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 búsquedas por minuto
  message: {
    ok: false,
    error: 'Demasiadas búsquedas en poco tiempo.'
  },
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Límite de búsquedas excedido. Por favor, espera un momento.',
      retryAfter: '1 minuto'
    });
  }
});

/**
 * Rate limiter para uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 uploads por minuto
  message: {
    ok: false,
    error: 'Demasiados archivos subidos en poco tiempo.'
  },
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Límite de uploads excedido. Por favor, espera un momento.',
      retryAfter: '1 minuto'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter,
  messageLimiter,
  searchLimiter,
  uploadLimiter
};
