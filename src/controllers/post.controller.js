const postService = require('../services/post.service');

class PostController {
  /**
   * Crear publicación
   */
  async create(req, res, next) {
    try {
      const post = await postService.createPost(req.body, req.user.id);

      res.status(201).json({
        ok: true,
        message: 'Publicación creada exitosamente',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener feed de publicaciones
   */
  async getFeed(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await postService.getFeed(
        req.user.id,
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
   * Obtener publicación por ID
   */
  async getById(req, res, next) {
    try {
      const post = await postService.getPostById(req.params.id);

      res.json({
        ok: true,
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener publicaciones de un usuario
   */
  async getUserPosts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await postService.getUserPosts(
        req.params.userId,
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
   * Dar/quitar like
   */
  async toggleLike(req, res, next) {
    try {
      const post = await postService.toggleLike(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: 'Like actualizado',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agregar comentario
   */
  async addComment(req, res, next) {
    try {
      const { contenido } = req.body;

      if (!contenido) {
        return res.status(400).json({
          ok: false,
          error: 'El contenido del comentario es requerido'
        });
      }

      const post = await postService.addComment(
        req.params.id,
        req.user.id,
        contenido
      );

      res.json({
        ok: true,
        message: 'Comentario agregado',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar publicación
   */
  async delete(req, res, next) {
    try {
      const result = await postService.deletePost(req.params.id, req.user.id);

      res.json({
        ok: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compartir publicación
   */
  async share(req, res, next) {
    try {
      const { contenido } = req.body;

      const post = await postService.sharePost(
        req.params.id,
        req.user.id,
        contenido
      );

      res.json({
        ok: true,
        message: 'Publicación compartida',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
