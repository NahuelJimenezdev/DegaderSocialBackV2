/**
 * Middlewares de validación para diferentes entidades
 */

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateUser = (req, res, next) => {
  const { nombre, apellido, email, password } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      ok: false,
      error: 'Nombre y apellido son requeridos'
    });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: 'Email inválido'
    });
  }

  if (password && password.length < 6) {
    return res.status(400).json({
      ok: false,
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  next();
};

const validatePost = (req, res, next) => {
  const { contenido } = req.body;

  if (!contenido || contenido.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'El contenido de la publicación es requerido'
    });
  }

  if (contenido.length > 5000) {
    return res.status(400).json({
      ok: false,
      error: 'El contenido no puede exceder los 5000 caracteres'
    });
  }

  next();
};

const validateEvento = (req, res, next) => {
  const { titulo, descripcion, fechaInicio, fechaFin } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({
      ok: false,
      error: 'Título y descripción son requeridos'
    });
  }

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({
      ok: false,
      error: 'Fechas de inicio y fin son requeridas'
    });
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (inicio >= fin) {
    return res.status(400).json({
      ok: false,
      error: 'La fecha de fin debe ser posterior a la fecha de inicio'
    });
  }

  next();
};

const validateGrupo = (req, res, next) => {
  const { nombre } = req.body;

  if (!nombre || nombre.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'El nombre del grupo es requerido'
    });
  }

  next();
};

module.exports = {
  validateUser,
  validatePost,
  validateEvento,
  validateGrupo
};
