const searchService = require('../services/search.service');

class SearchController {
  /**
   * Búsqueda global
   */
  async search(req, res, next) {
    try {
      const { q, tipo = 'all', page = 1, limit = 20 } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'El parámetro de búsqueda "q" es requerido'
        });
      }

      const results = await searchService.globalSearch(
        q,
        tipo,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        ok: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
