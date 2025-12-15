/**
 * Validador de email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validador de contraseña
 * Mínimo 6 caracteres
 */
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Validador de contraseña fuerte
 * Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
 */
const isStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongPasswordRegex.test(password);
};

/**
 * Sanitizar texto - remover caracteres peligrosos
 */
const sanitizeText = (text) => {
  if (!text) return '';
  return text.trim().replace(/[<>]/g, '');
};

/**
 * Validar ObjectId de MongoDB
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validar datos de registro
 */
const validateRegisterData = (data) => {
  const errors = [];

  if (!data.nombre || data.nombre.trim().length === 0) {
    errors.push('El nombre es obligatorio');
  }

  if (!data.apellido || data.apellido.trim().length === 0) {
    errors.push('El apellido es obligatorio');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Email inválido');
  }

  if (!data.password || !isValidPassword(data.password)) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }

  if (!data.fechaNacimiento) {
    errors.push('La fecha de nacimiento es obligatoria');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validar datos de publicación
 */
const validatePostData = (data) => {
  const errors = [];

  // El contenido es obligatorio SOLO si no hay imágenes ni videos
  const hasMedia = (data.images && data.images.length > 0) || (data.videos && data.videos.length > 0);

  if (!hasMedia && (!data.contenido || data.contenido.trim().length === 0)) {
    errors.push('El contenido es obligatorio si no hay imágenes o videos');
  }

  if (data.contenido && data.contenido.length > 5000) {
    errors.push('El contenido no puede superar los 5000 caracteres');
  }

  if (data.privacidad && !['publico', 'amigos', 'privado'].includes(data.privacidad)) {
    errors.push('Privacidad inválida');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validar datos de grupo
 */
const validateGroupData = (data) => {
  const errors = [];

  if (!data.nombre || data.nombre.trim().length === 0) {
    errors.push('El nombre del grupo es obligatorio');
  }

  if (data.nombre && data.nombre.length > 100) {
    errors.push('El nombre no puede superar los 100 caracteres');
  }

  if (data.tipo && !['publico', 'privado', 'secreto'].includes(data.tipo)) {
    errors.push('Tipo de grupo inválido');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generar mensaje de error estandarizado
 */
const formatErrorResponse = (message, errors = []) => {
  return {
    success: false,
    message,
    errors
  };
};

/**
 * Generar respuesta exitosa estandarizada
 */
const formatSuccessResponse = (message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isStrongPassword,
  sanitizeText,
  isValidObjectId,
  validateRegisterData,
  validatePostData,
  validateGroupData,
  formatErrorResponse,
  formatSuccessResponse
};
