const Post = require('../models/Post');

class PostService {
  /**
   * Crear nueva publicación
   */
  async createPost(postData, userId) {
    const post = new Post({
      ...postData,
      autor: userId
    });

    await post.save();
    await post.populate('autor', 'nombre apellido avatar');

    return post;
  }

  /**
   * Obtener feed de publicaciones
   */
  async getFeed(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // TODO: Implementar lógica para mostrar posts de amigos
    const posts = await Post.find({
      activo: true,
      $or: [
        { visibilidad: 'publico' },
        { autor: userId }
      ]
    })
      .populate('autor', 'nombre apellido avatar verificado')
      .populate('comentarios.autor', 'nombre apellido avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Post.countDocuments({
      activo: true,
      $or: [
        { visibilidad: 'publico' },
        { autor: userId }
      ]
    });

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener publicación por ID
   */
  async getPostById(postId) {
    const post = await Post.findById(postId)
      .populate('autor', 'nombre apellido avatar verificado')
      .populate('comentarios.autor', 'nombre apellido avatar');

    if (!post || !post.activo) {
      throw new Error('Publicación no encontrada');
    }

    return post;
  }

  /**
   * Obtener publicaciones de un usuario
   */
  async getUserPosts(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const posts = await Post.find({ autor: userId, activo: true })
      .populate('autor', 'nombre apellido avatar verificado')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Post.countDocuments({ autor: userId, activo: true });

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Dar/quitar like a una publicación
   */
  async toggleLike(postId, userId) {
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error('Publicación no encontrada');
    }

    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Quitar like
      post.likes.splice(likeIndex, 1);
    } else {
      // Agregar like
      post.likes.push(userId);
    }

    await post.save();
    return post;
  }

  /**
   * Agregar comentario a una publicación
   */
  async addComment(postId, userId, contenido) {
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error('Publicación no encontrada');
    }

    post.comentarios.push({
      autor: userId,
      contenido,
      fecha: new Date()
    });

    await post.save();
    await post.populate('comentarios.autor', 'nombre apellido avatar');

    return post;
  }

  /**
   * Eliminar publicación
   */
  async deletePost(postId, userId) {
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error('Publicación no encontrada');
    }

    // Verificar que el usuario sea el autor
    if (post.autor.toString() !== userId.toString()) {
      throw new Error('No tienes permiso para eliminar esta publicación');
    }

    post.activo = false;
    await post.save();

    return { message: 'Publicación eliminada exitosamente' };
  }

  /**
   * Compartir publicación
   */
  async sharePost(postId, userId, contenido = '') {
    const postOriginal = await Post.findById(postId);

    if (!postOriginal) {
      throw new Error('Publicación no encontrada');
    }

    const post = new Post({
      autor: userId,
      contenido: contenido || `Compartió la publicación de ${postOriginal.autor}`,
      compartido: true,
      postOriginal: postId,
      visibilidad: 'publico'
    });

    await post.save();
    await post.populate('autor', 'nombre apellido avatar');
    await post.populate('postOriginal');

    return post;
  }
}

module.exports = new PostService();
