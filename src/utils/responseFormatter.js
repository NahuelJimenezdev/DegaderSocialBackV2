/**
 * Formatear respuesta exitosa
 * @param {string} message - Mensaje de éxito
 * @param {any} data - Datos a devolver
 * @returns {object} Respuesta formateada
 */
const formatSuccessResponse = (message, data = null) => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Formatear respuesta de error
 * @param {string} message - Mensaje de error
 * @param {array} errors - Array de errores detallados
 * @returns {object} Respuesta formateada
 */
const formatErrorResponse = (message, errors = []) => {
  return {
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors]
  };
};

module.exports = {
  formatSuccessResponse,
  formatErrorResponse
};
