const Post = require('../models/Post');
const Notification = require('../models/Notification');
const Group = require('../models/Group');
const { validatePostData, formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');

/**
 * Crear publicación
 * POST /api/publicaciones
 */
const createPost = async (req, res) => {
  try {
    console.log('📝 [CREATE POST] Request received');
    console.log('📝 [CREATE POST] Body keys:', Object.keys(req.body));
    console.log('📝 [CREATE POST] Files:', req.files ? req.files.length : 0);
    console.log('📝 [CREATE POST] Has images (base64):', !!req.body.images, 'Count:', req.body.images?.length);

    const { contenido, privacidad = 'publico', etiquetas, grupo, images = [], videos = [] } = req.body;

    console.log('📝 [CREATE POST] Extracted data:', {
      contenido: contenido?.substring(0, 50),
      privacidad,
      imageCount: images.length,
      videoCount: videos.length,
      filesCount: req.files?.length || 0,
      hasGrupo: !!grupo
    });

    // Validar datos - IMPORTANTE: considerar archivos en req.files además de base64
    const hasFiles = req.files && req.files.length > 0;
    const validation = validatePostData({ contenido, privacidad, images, videos, hasFiles });
    if (!validation.isValid) {
      console.log('❌ [CREATE POST] Validation failed:', validation.errors);
      return res.status(400).json(formatErrorResponse('Datos inválidos', validation.errors));
    }

    console.log('✅ [CREATE POST] Validation passed');

    const postData = {
      usuario: req.userId,
      contenido,
      privacidad,
      etiquetas: etiquetas ? etiquetas.split(',').map(t => t.trim()) : []
    };

    // 🆕 PROCESAR ARCHIVOS SUBIDOS A R2 (prioridad sobre base64)
    if (req.files && req.files.length > 0) {
      console.log('📤 [CREATE POST] Uploading', req.files.length, 'files to R2...');

      const uploadedImages = [];
      const uploadedVideos = [];

      for (const file of req.files) {
        try {
          const fileUrl = await uploadToR2(file.buffer, file.originalname, 'posts');
          console.log('✅ [CREATE POST] File uploaded to R2:', fileUrl);

          // Clasificar por tipo de archivo
          if (file.mimetype.startsWith('image/')) {
            uploadedImages.push({ url: fileUrl });
          } else if (file.mimetype.startsWith('video/')) {
            uploadedVideos.push({ url: fileUrl });
          }
        } catch (uploadError) {
          console.error('❌ [CREATE POST] Error uploading file to R2:', uploadError);
          // Continuar con los demás archivos
        }
      }

      if (uploadedImages.length > 0) {
        postData.images = uploadedImages;
        console.log('📸 [CREATE POST] Added', uploadedImages.length, 'images from R2');
      }

      if (uploadedVideos.length > 0) {
        postData.videos = uploadedVideos;
        console.log('🎥 [CREATE POST] Added', uploadedVideos.length, 'videos from R2');
      }
    }
    // Si no hay archivos subidos, usar base64 del body
    else {
      // Agregar imágenes en formato base64 (sistema legacy)
      if (Array.isArray(images) && images.length > 0) {
        console.log('📸 [CREATE POST] Adding', images.length, 'images (base64)');
        postData.images = images.map(img => ({ url: img }));
      }

      // Agregar videos en formato base64 (sistema legacy)
      if (Array.isArray(videos) && videos.length > 0) {
        console.log('🎥 [CREATE POST] Adding', videos.length, 'videos (base64)');
        postData.videos = videos.map(vid => ({ url: vid }));
      }
    }

    // Mantener compatibilidad con sistema legacy de multer (single file)
    if (req.file) {
      console.log('📎 [CREATE POST] Legacy single file upload detected');
      postData.imagen = `/uploads/posts/${req.file.filename}`;
    }

    // Agregar grupo si se especificó
    if (grupo && isValidObjectId(grupo)) {
      console.log('👥 [CREATE POST] Adding to group:', grupo);
      postData.grupo = grupo;
    }

    console.log('💾 [CREATE POST] Creating post in database...');
    const post = new Post(postData);
    await post.save();
    console.log('✅ [CREATE POST] Post saved with ID:', post._id);

    // Poblar usuario
    await post.populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil');
    console.log('✅ [CREATE POST] Post populated');

    // Emitir nuevo post en tiempo real
    try {
      if (global.emitPostUpdate) {
        global.emitPostUpdate(post);
      }
    } catch (socketError) {
      console.error('⚠️ [CREATE POST] Socket emit error:', socketError);
    }

    res.status(201).json(formatSuccessResponse('Publicación creada exitosamente', post));
  } catch (error) {
    console.error('❌ [CREATE POST] ERROR:', error);
    console.error('❌ [CREATE POST] Error name:', error.name);
    console.error('❌ [CREATE POST] Error message:', error.message);
    console.error('❌ [CREATE POST] Error stack:', error.stack);
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

    // Obtener grupos del usuario
    const userGroups = await Group.find({
      'miembros.usuario': req.userId
    }).select('_id');

    const userGroupIds = userGroups.map(g => g._id);

    // Obtener publicaciones
    const posts = await Post.find({
      $or: [
        // 1. Posts de amigos en su perfil (sin grupo o grupo null)
        {
          usuario: { $in: friendIds },
          privacidad: { $in: ['publico', 'amigos'] },
          $or: [{ grupo: { $exists: false } }, { grupo: null }]
        },
        // 2. Mis posts (en cualquier lado)
        { usuario: req.userId },
        // 3. Posts de grupos donde soy miembro
        { grupo: { $in: userGroupIds } }
      ]
    })
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('grupo', 'nombre tipo')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({
      $or: [
        {
          usuario: { $in: friendIds },
          privacidad: { $in: ['publico', 'amigos'] },
          $or: [{ grupo: { $exists: false } }, { grupo: null }]
        },
        { usuario: req.userId },
        { grupo: { $in: userGroupIds } }
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
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('grupo', 'nombre tipo')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
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
 * Obtener publicaciones de un grupo
 * GET /api/publicaciones/grupo/:groupId
 */
const getGroupPosts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(groupId)) {
      return res.status(400).json(formatErrorResponse('ID de grupo inválido'));
    }

    // Verificar si el usuario es miembro del grupo (para grupos privados/secretos)
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json(formatErrorResponse('Grupo no encontrado'));
    }

    if (group.tipo !== 'publico') {
      const isMember = group.miembros.some(m => m.usuario.equals(req.userId));
      if (!isMember && !group.creador.equals(req.userId)) {
        return res.status(403).json(formatErrorResponse('No tienes acceso a las publicaciones de este grupo'));
      }
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find({ grupo: groupId })
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('grupo', 'nombre tipo')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({ grupo: groupId });

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
    console.error('Error al obtener publicaciones del grupo:', error);
    res.status(500).json(formatErrorResponse('Error al obtener publicaciones del grupo', [error.message]));
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
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil')
      .populate('grupo', 'nombre tipo')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
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

      // Emitir actualización del post en tiempo real
      try {
        if (global.emitPostUpdate) {
          // Poblar antes de emitir
          await post.populate([
            { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
            { path: 'grupo', select: 'nombre tipo' },
            { path: 'postOriginal' },
            { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
          ]);
          global.emitPostUpdate(post);
        }
      } catch (socketError) {
        console.error('⚠️ [LIKE] Socket emit error:', socketError);
      }

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

        // IMPORTANTE: Popula emisor antes de emitir por Socket.IO
        const notificationPopulated = await Notification.findById(notification._id)
          .populate({
            path: 'emisor',
            select: 'nombres apellidos social.fotoPerfil username'
          });

        // Emitir notificación en tiempo real
        if (global.emitNotification) {
          global.emitNotification(post.usuario.toString(), notificationPopulated);
        }
      }

      // Emitir actualización del post en tiempo real
      try {
        if (global.emitPostUpdate) {
          // Poblar antes de emitir
          await post.populate([
            { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
            { path: 'grupo', select: 'nombre tipo' },
            { path: 'postOriginal' },
            { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
          ]);
          global.emitPostUpdate(post);
        }
      } catch (socketError) {
        console.error('⚠️ [LIKE] Socket emit error:', socketError);
      }

      return res.json(formatSuccessResponse('Like agregado', { liked: true, totalLikes: post.likes.length }));
    }
  } catch (error) {
    console.error('Error al dar like:', error);
    res.status(500).json(formatErrorResponse('Error al procesar like', [error.message]));
  }
};

/**
 * Comentar publicación o responder a un comentario
 * POST /api/publicaciones/:id/comment
 * Body: { contenido, parentCommentId? }
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, parentCommentId, image } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Procesar imagen si viene en req.files (FormData con R2)
    let imageUrl = image || null;

    if (req.files && req.files.length > 0) {
      try {
        const file = req.files[0];
        imageUrl = await uploadToR2(file.buffer, file.originalname, 'comments');
        console.log('✅ [ADD COMMENT] Image uploaded to R2:', imageUrl);
      } catch (uploadError) {
        console.error('❌ [ADD COMMENT] Error uploading image to R2:', uploadError);
        return res.status(500).json(formatErrorResponse('Error al subir la imagen'));
      }
    }

    // Validar que haya contenido o imagen
    if ((!contenido || contenido.trim().length === 0) && !imageUrl) {
      return res.status(400).json(formatErrorResponse('El comentario debe tener texto o una imagen'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    // Si es una respuesta, verificar que el comentario padre existe y no sea ya una respuesta
    if (parentCommentId) {
      const parentComment = post.comentarios.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json(formatErrorResponse('Comentario padre no encontrado'));
      }
      // Verificar que el padre no sea ya una respuesta (máximo 2 niveles)
      if (parentComment.parentComment) {
        return res.status(400).json(formatErrorResponse('No se pueden anidar más de 2 niveles de comentarios'));
      }
    }

    const comment = {
      usuario: req.userId,
      contenido: contenido ? contenido.trim() : '',
      image: imageUrl,
      likes: [],
      parentComment: parentCommentId || null
    };

    post.comentarios.push(comment);
    await post.save();

    // Poblar todo el post antes de emitir actualización global
    // Esto asegura que el frontend reciba datos consistentes (usuario poblado, grupo, etc.)
    await post.populate([
      { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      { path: 'grupo', select: 'nombre tipo' },
      { path: 'postOriginal' },
      { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
    ]);

    // Crear notificación
    try {
      if (parentCommentId) {
        // Notificar al autor del comentario padre
        const parentComment = post.comentarios.id(parentCommentId);
        // parentComment.usuario es un ObjectId (ya poblado arriba, así que verificamos ID)
        if (parentComment && parentComment.usuario && !parentComment.usuario._id.equals(req.userId)) {
          const notification = new Notification({
            receptor: parentComment.usuario._id,
            emisor: req.userId,
            tipo: 'respuesta_comentario',
            contenido: 'respondió a tu comentario',
            referencia: {
              tipo: 'Post',
              id: post._id
            }
          });
          await notification.save();

          // IMPORTANTE: Popula emisor antes de emitir por Socket.IO
          const notificationPopulated = await Notification.findById(notification._id)
            .populate({
              path: 'emisor',
              select: 'nombres apellidos social.fotoPerfil username'
            });

          // Emitir notificación en tiempo real
          if (global.emitNotification) {
            global.emitNotification(parentComment.usuario._id.toString(), notificationPopulated);
          }
        }
      } else if (!post.usuario._id.equals(req.userId)) {
        // Notificar al autor del post
        const notification = new Notification({
          receptor: post.usuario._id,
          emisor: req.userId,
          tipo: 'comentario_post',
          contenido: 'comentó tu publicación',
          referencia: {
            tipo: 'Post',
            id: post._id
          }
        });
        await notification.save();

        // IMPORTANTE: Popula emisor antes de emitir por Socket.IO
        const notificationPopulated = await Notification.findById(notification._id)
          .populate({
            path: 'emisor',
            select: 'nombres apellidos social.fotoPerfil username'
          });

        // Emitir notificación en tiempo real
        if (global.emitNotification) {
          global.emitNotification(post.usuario._id.toString(), notificationPopulated);
        }
      }
    } catch (notifError) {
      console.error('⚠️ [COMMENT] Notification error:', notifError);
    }

    // Emitir actualización del post en tiempo real
    try {
      if (global.emitPostUpdate) {
        global.emitPostUpdate(post);
      }
    } catch (socketError) {
      console.error('⚠️ [COMMENT] Socket emit error:', socketError);
    }

    // Para la respuesta HTTP devolvemos solo el comentario nuevo
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

    // Poblar datos del post compartido
    await sharedPost.populate([
      { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      {
        path: 'postOriginal',
        populate: { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
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

      // IMPORTANTE: Popula emisor antes de emitir por Socket.IO
      const notificationPopulated = await Notification.findById(notification._id)
        .populate({
          path: 'emisor',
          select: 'nombres apellidos social.fotoPerfil username'
        });

      // Emitir notificación en tiempo real
      if (global.emitNotification) {
        global.emitNotification(originalPost.usuario.toString(), notificationPopulated);
      }
    }

    // Emitir actualización del post original en tiempo real (para actualizar contador de compartidos)
    if (global.emitPostUpdate) {
      // Poblar original antes de emitir
      await originalPost.populate([
        { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
        { path: 'grupo', select: 'nombre tipo' },
        { path: 'postOriginal' },
        { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
      ]);
      global.emitPostUpdate(originalPost);
    }

    // Emitir el nuevo post compartido al feed
    if (global.emitPostUpdate) {
      global.emitPostUpdate(sharedPost);
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

    // Emitir evento de eliminación (opcional, si el frontend lo maneja)
    // if (global.emitPostDelete) {
    //   global.emitPostDelete(id);
    // }

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
  getGroupPosts,
  getPostById,
  toggleLike,
  addComment,
  sharePost,
  deletePost
};
