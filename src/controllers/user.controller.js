const userService = require('../services/user.service');

class UserController {
  /**
   * Obtener todos los usuarios
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, area } = req.query;
      const filters = {};

      if (area) filters.area = area;

      const result = await userService.getAllUsers(
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);

      res.json({
        ok: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Buscar usuarios
   */
  async search(req, res, next) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({
          ok: false,
          error: 'El parámetro de búsqueda "q" es requerido'
        });
      }

      const result = await userService.searchUsers(
        q,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar perfil
   */
  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);

      res.json({
        ok: true,
        message: 'Perfil actualizado exitosamente',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar avatar
   */
  async updateAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: 'No se proporcionó ningún archivo'
        });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await userService.updateAvatar(req.user.id, avatarUrl);

      res.json({
        ok: true,
        message: 'Avatar actualizado exitosamente',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Desactivar usuario
   */
  async deactivate(req, res, next) {
    try {
      const result = await userService.deactivateUser(req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
