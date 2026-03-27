const recommendationService = require('../services/recommendationService');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');
const logger = require('../config/logger');

/**
 * Obtener recomendaciones de usuarios para el carrusel
 * GET /api/recommendations
 * Query params: limit, excludeIds (JSON array)
 */
const getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    // Parsear excludeIds si vienen como string JSON
    let excludeIds = [];
    if (req.query.excludeIds) {
      try {
        excludeIds = JSON.parse(req.query.excludeIds);
        if (!Array.isArray(excludeIds)) excludeIds = [];
      } catch (err) {
        logger.warn(`Error al parsear excludeIds en recommendations: ${err.message}`);
        excludeIds = [];
      }
    }

    const recommendations = await recommendationService.getRecommendedUsers(userId, limit, excludeIds);

    res.json(formatSuccessResponse('Recomendaciones obtenidas exitosamente', recommendations));
  } catch (error) {
    logger.error(`Error en controller de recomendaciones: ${error.message}`, { stack: error.stack });
    res.status(500).json(formatErrorResponse('Error al obtener recomendaciones', [error.message]));
  }
};

module.exports = {
  getRecommendations
};
