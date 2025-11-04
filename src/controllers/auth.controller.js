const authService = require('../services/auth.service');

class AuthController {
  /**
   * Registrar nuevo usuario
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        ok: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          error: 'Email y contraseña son requeridos'
        });
      }

      const result = await authService.login(email, password);

      res.json({
        ok: true,
        message: 'Login exitoso',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener usuario actual (profile)
   */
  async getCurrentUser(req, res, next) {
    try {
      const userService = require('../services/user.service');
      const user = await userService.getUserById(req.user.id);

      res.json({
        ok: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          ok: false,
          error: 'Contraseña actual y nueva contraseña son requeridas'
        });
      }

      const result = await authService.changePassword(
        req.user.id,
        oldPassword,
        newPassword
      );

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
