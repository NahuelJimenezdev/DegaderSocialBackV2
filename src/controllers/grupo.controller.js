const grupoService = require('../services/grupo.service');

class GrupoController {
  /**
   * Crear grupo
   */
  async create(req, res, next) {
    try {
      const grupo = await grupoService.createGroup(req.body, req.user.id);

      res.status(201).json({
        ok: true,
        message: 'Grupo creado exitosamente',
        data: grupo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los grupos
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, tipo, categoria } = req.query;
      const filters = {};

      if (tipo) filters.tipo = tipo;
      if (categoria) filters.categoria = categoria;

      const result = await grupoService.getAllGroups(
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
   * Obtener grupo por ID
   */
  async getById(req, res, next) {
    try {
      const grupo = await grupoService.getGroupById(req.params.id, req.user?.id);

      res.json({
        ok: true,
        data: grupo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unirse a grupo
   */
  async join(req, res, next) {
    try {
      const result = await grupoService.joinGroup(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: result.message || 'Te has unido al grupo',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Salir del grupo
   */
  async leave(req, res, next) {
    try {
      const result = await grupoService.leaveGroup(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aceptar solicitud de ingreso
   */
  async acceptJoinRequest(req, res, next) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          ok: false,
          error: 'El ID del usuario es requerido'
        });
      }

      const grupo = await grupoService.acceptJoinRequest(
        req.params.id,
        userId,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Solicitud aceptada',
        data: grupo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar rol de miembro
   */
  async updateMemberRole(req, res, next) {
    try {
      const { userId, rol } = req.body;

      if (!userId || !rol) {
        return res.status(400).json({
          ok: false,
          error: 'El ID del usuario y el rol son requeridos'
        });
      }

      const grupo = await grupoService.updateMemberRole(
        req.params.id,
        userId,
        rol,
        req.user.id
      );

      res.json({
        ok: true,
        message: 'Rol actualizado',
        data: grupo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar grupo
   */
  async delete(req, res, next) {
    try {
      const result = await grupoService.deleteGroup(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GrupoController();
