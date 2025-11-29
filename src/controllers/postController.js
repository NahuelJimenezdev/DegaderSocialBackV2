const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { validatePostData, formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Crear publicación
 * POST /api/publicaciones
 */
const createPost = async (req, res) => {
  try {
    const { contenido, privacidad = 'publico', etiquetas, grupo, images = [], videos = [] } = req.body;

    // Validar datos
    const validation = validatePostData({ contenido, privacidad });
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse('Datos inválidos', validation.errors));
    }

    const postData = {
      usuario: req.userId,
      contenido,
      privacidad,
      etiquetas: etiquetas ? etiquetas.split(',').map(t => t.trim()) : []
    };

    // Agregar imágenes en formato base64 (nuevo sistema)
    if (Array.isArray(images) && images.length > 0) {
      postData.images = images;
    }

    // Agregar videos en formato base64 (nuevo sistema)
    if (Array.isArray(videos) && videos.length > 0) {
      postData.videos = videos;
    }

    // Mantener compatibilidad con sistema legacy de multer
    if (req.file) {
      postData.imagen = `/uploads/posts/${req.file.filename}`;
    }

    // Agregar grupo si se especificó
    if (grupo && isValidObjectId(grupo)) {
      postData.grupo = grupo;
    }

    const post = new Post(postData);
    await post.save();

    // Poblar usuario
    await post.populate('usuario', 'nombres apellidos social');

    res.status(201).json(formatSuccessResponse('Publicación creada exitosamente', post));
  } catch (error) {
    console.error('Error al crear publicación:', error);
    res.status(500).json(formatErrorResponse('Error al crear publicación', [error.message]));
  }
};

/**
 * Obtener feed de publicaciones
 * GET /api/publicaciones/feed
 */
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const Friendship = require('../models/Friendship');

    // Obtener IDs de amigos
    const friendships = await Friendship.find({
      $or: [
        { solicitante: req.userId, estado: 'aceptada' },
        { receptor: req.userId, estado: 'aceptada' }
      ]
    });

    const friendIds = friendships.map(f =>
      f.solicitante.equals(req.userId) ? f.receptor : f.solicitante
    );

    // Incluir el propio usuario en el feed
    const userIds = [req.userId, ...friendIds];

    // Obtener publicaciones
    const posts = await Post.find({
      $or: [
        { usuario: { $in: userIds }, privacidad: { $in: ['publico', 'amigos'] } },
        { usuario: req.userId } // Incluir todas las propias
      ]
    })
      .populate('usuario', 'nombres apellidos social')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres apellidos social'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({
      $or: [
        { usuario: { $in: userIds }, privacidad: { $in: ['publico', 'amigos'] } },
        { usuario: req.userId }
      ]
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener feed:', error);
    res.status(500).json(formatErrorResponse('Error al obtener feed', [error.message]));
  }
};

/**
 * Obtener publicaciones de un usuario
 * GET /api/publicaciones/user/:userId
 */
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(userId)) {
      return res.status(400).json(formatErrorResponse('ID de usuario inválido'));
    }

    const skip = (page - 1) * limit;

    // Determinar privacidad según si es el propio usuario
    const privacyFilter = userId === req.userId.toString()
      ? {} // Ver todas si es el propio usuario
      : { privacidad: 'publico' }; // Solo públicas si es otro usuario

    const posts = await Post.find({
      usuario: userId,
      ...privacyFilter
    })
      .populate('usuario', 'nombres apellidos social')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres apellidos social'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({
      usuario: userId,
      ...privacyFilter
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener publicaciones:', error);
    res.status(500).json(formatErrorResponse('Error al obtener publicaciones', [error.message]));
  }
};

/**
 * Obtener publicación por ID
 * GET /api/publicaciones/:id
 */
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const post = await Post.findById(id)
      .populate('usuario', 'nombres apellidos social')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres apellidos social'
      });

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    res.json(formatSuccessResponse('Publicación encontrada', post));
  } catch (error) {
    console.error('Error al obtener publicación:', error);
    res.status(500).json(formatErrorResponse('Error al obtener publicación', [error.message]));
  }
};

/**
 * Dar/quitar like a publicación
 * POST /api/publicaciones/:id/like
 */
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    const likeIndex = post.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      // Quitar like
      post.likes.splice(likeIndex, 1);
      await post.save();
      return res.json(formatSuccessResponse('Like removido', { liked: false, totalLikes: post.likes.length }));
    } else {
      // Dar like
      post.likes.push(req.userId);
      await post.save();

      // Crear notificación si no es el propio usuario
      if (!post.usuario.equals(req.userId)) {
        const notification = new Notification({
          receptor: post.usuario,
          emisor: req.userId,
          tipo: 'like_post',
          contenido: 'le dio like a tu publicación',
          referencia: {
            tipo: 'Post',
            id: post._id
          }
        });
        await notification.save();
      }

      return res.json(formatSuccessResponse('Like agregado', { liked: true, totalLikes: post.likes.length }));
    }
  } catch (error) {
    console.error('Error al dar like:', error);
    res.status(500).json(formatErrorResponse('Error al procesar like', [error.message]));
  }
};

/**
 * Comentar publicación
 * POST /api/publicaciones/:id/comment
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json(formatErrorResponse('El contenido del comentario es obligatorio'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    const comment = {
      usuario: req.userId,
      contenido: contenido.trim(),
      likes: []
    };

    post.comentarios.push(comment);
    await post.save();

    // Poblar el comentario recién agregado
    await post.populate({
      path: 'comentarios.usuario',
      select: 'nombres apellidos social'
    });

    // Crear notificación
    if (!post.usuario.equals(req.userId)) {
      const notification = new Notification({
        receptor: post.usuario,
        emisor: req.userId,
        tipo: 'comentario_post',
        contenido: 'comentó tu publicación',
        referencia: {
          tipo: 'Post',
          id: post._id
        }
      });
      await notification.save();
    }

    const newComment = post.comentarios[post.comentarios.length - 1];

    res.status(201).json(formatSuccessResponse('Comentario agregado', newComment));
  } catch (error) {
    console.error('Error al comentar:', error);
    res.status(500).json(formatErrorResponse('Error al agregar comentario', [error.message]));
  }
};

/**
 * Compartir publicación
 * POST /api/publicaciones/:id/share
 */
const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const originalPost = await Post.findById(id);

    if (!originalPost) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    // Crear nueva publicación compartida
    const sharedPost = new Post({
      usuario: req.userId,
      contenido: contenido || '',
      tipo: 'compartido',
      postOriginal: originalPost._id,
      privacidad: 'publico'
    });

    await sharedPost.save();

    // Agregar al contador de compartidos del post original
    originalPost.compartidos.push({
      usuario: req.userId,
      fecha: new Date()
    });
    await originalPost.save();

    // Poblar datos
    await sharedPost.populate([
      { path: 'usuario', select: 'nombres apellidos social' },
      {
        path: 'postOriginal',
        populate: { path: 'usuario', select: 'nombres apellidos social' }
      }
    ]);

    // Crear notificación
    if (!originalPost.usuario.equals(req.userId)) {
      const notification = new Notification({
        receptor: originalPost.usuario,
        emisor: req.userId,
        tipo: 'compartir_post',
        contenido: 'compartió tu publicación',
        referencia: {
          tipo: 'Post',
          id: originalPost._id
        }
      });
      await notification.save();
    }

    res.status(201).json(formatSuccessResponse('Publicación compartida exitosamente', sharedPost));
  } catch (error) {
    console.error('Error al compartir:', error);
    res.status(500).json(formatErrorResponse('Error al compartir publicación', [error.message]));
  }
};

/**
 * Eliminar publicación
 * DELETE /api/publicaciones/:id
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    // Verificar que sea el autor o admin
    if (!post.usuario.equals(req.userId) && req.user.rol !== 'admin') {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar esta publicación'));
    }

    await Post.findByIdAndDelete(id);

    res.json(formatSuccessResponse('Publicación eliminada exitosamente'));
  } catch (error) {
    console.error('Error al eliminar publicación:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar publicación', [error.message]));
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  getPostById,
  toggleLike,
  addComment,
  sharePost,
  deletePost
};
