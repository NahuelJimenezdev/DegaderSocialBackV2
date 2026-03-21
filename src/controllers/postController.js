const Post = require('../models/Post.model');
const PostComment = require('../models/PostComment.model'); // 🆕 Nuevo modelo desacoplado
const PostLike = require('../models/PostLike.model'); // 🆕 Nuevo modelo desacoplado
const notificationService = require('../services/notification.service');
const Group = require('../models/Group.model');
const Friendship = require('../models/Friendship.model'); // 🆕 Importar modelo de amistad
const UserV2 = require('../models/User.model'); // 🆕 Importar modelo de usuario para verificar roles
const { validatePostData, formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const { uploadToR2, deleteFromR2 } = require('../services/r2Service');
const { processAndUploadImage } = require('../services/imageOptimizationService');
const feedService = require('../services/feed.service'); // 🆕 Nuevo servicio para escalabilidad

/**
 * Helper: Verificar si el usuario puede interactuar con el post de otro usuario
 */
const canInteractWithPost = async (userId, targetUserId, post = null, action = 'interact') => {
  // 1. Si es el mismo usuario, permitido
  if (userId.toString() === targetUserId.toString()) return true;

  // 2. Verificar rol del usuario que interactúa (Staff puede moderar/interactuar)
  const actingUser = await UserV2.findById(userId).select('seguridad.rolSistema');
  if (actingUser && ['Founder', 'admin', 'moderador'].includes(actingUser.seguridad?.rolSistema)) {
    return true;
  }

  // 3. REGLA ESPECIAL: Permitir LIKE a publicaciones PÚBLICAS del FOUNDER sin ser amigos
  if (action === 'like' && post && post.privacidad === 'publico') {
    const targetUser = await UserV2.findById(targetUserId).select('seguridad.rolSistema');
    if (targetUser && targetUser.seguridad?.rolSistema === 'Founder') {
      return true;
    }
  }

  // 4. Verificar amistad aceptada
  const friendship = await Friendship.findOne({
    $or: [
      { solicitante: userId, receptor: targetUserId },
      { solicitante: targetUserId, receptor: userId }
    ],
    estado: 'aceptada'
  });

  return !!friendship;
};

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
          // Clasificar por tipo de archivo
          if (file.mimetype.startsWith('image/')) {
            const optimizedResult = await processAndUploadImage(file.buffer, file.originalname, 'posts');
            uploadedImages.push({
              url: optimizedResult.large || optimizedResult.medium || optimizedResult.small,
              small: optimizedResult.small,
              medium: optimizedResult.medium,
              large: optimizedResult.large,
              blurHash: optimizedResult.blurHash
            });
            console.log('✅ [CREATE POST] Image optimized and uploaded to R2');
          } else if (file.mimetype.startsWith('video/')) {
            const fileUrl = await uploadToR2(file.buffer, file.originalname, 'posts');
            uploadedVideos.push({ url: fileUrl });
            console.log('✅ [CREATE POST] Video uploaded to R2:', fileUrl);
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
    await post.populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema');
    console.log('✅ [CREATE POST] Post populated');

    // 🚀 FASE 2: Fan-out on Write (Inyectar en feeds de amigos vía Redis)
    feedService.fanOutPost(post).catch(err => console.error('⚠️ [FAN-OUT] Error:', err));

    // Emitir nuevo post en tiempo real
    try {
      if (global.emitPostUpdate) {
        global.emitPostUpdate(post);
      }
    } catch (socketError) {
      console.error('⚠️ [CREATE POST] Socket emit error:', socketError);
    }

    // 🔔 NOTIFICAR MENCIONES
    try {
      console.log('🔔 [CREATE POST] Checking for mentions in:', contenido);
      // Regex para encontrar @username (letras, números, puntos, guiones bajos)
      const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
      const extractedMentions = (contenido || '').match(mentionRegex);

      if (extractedMentions && extractedMentions.length > 0) {
        // Eliminar duplicados y quitar el '@'
        const uniqueMentions = [...new Set(extractedMentions)].map(m => m.slice(1));
        console.log('🔔 [CREATE POST] Mentions detected (clean):', uniqueMentions);

        // CORRECCIÓN: Usar el nombre de archivo correcto (User.model.js)
        const User = require('../models/User.model');
        const mentionedUsers = await User.find({
          $or: [
            { 'social.username': { $in: uniqueMentions } },
            { 'username': { $in: uniqueMentions } }
          ],
          _id: { $ne: req.userId }
        }).select('_id username social.username');

        console.log('🔔 [CREATE POST] Users found in DB:', mentionedUsers.length, mentionedUsers);

        if (mentionedUsers.length === 0) {
          // Fallback: check legacy 'username' field if social.username is empty
          const legacyUsers = await User.find({
            username: { $in: uniqueMentions },
            _id: { $ne: req.userId }
          }).select('_id username');
          console.log('🔔 [CREATE POST] Users found via legacy username path:', legacyUsers.length);
        }

        for (const user of mentionedUsers) {
          notificationService.notify({
            receptorId: user._id,
            emisorId: req.userId,
            tipo: 'mencion',
            contenido: 'te mencionó en una publicación',
            referencia: { tipo: 'Post', id: post._id }
          }).catch(err => logger.error(`⚠️ [MENTION] Post mention error: ${err.message}`));
        }
      }
    } catch (notifError) {
      console.error('⚠️ [CREATE POST] Notification error:', notifError);
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
    // Deshabilitar caché para asegurar que se muestren los datos más recientes (posts eliminados desaparecen)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const { page = 1, limit = 10, lastDate, lastScore: lastScoreQuery, lastId } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 10, 50);

    // 🚀 FASE 3: Ranking Inteligente (Algorítmico)
    // El score reemplaza al timestamp como cursor principal
    const lastScore = lastScoreQuery ? parseFloat(lastScoreQuery) : '+inf';
    
    // 1. Obtener IDs de Redis (Posts normales ordenados por Score)
    let cachedPostIds = await feedService.getFeedFromCache(req.userId, safeLimit, lastScore);
    
    // 2. Obtener IDs de Amigos (Reutilizable)
    const Friendship = require('../models/Friendship.model');
    const friendships = await Friendship.find({
      $or: [{ solicitante: req.userId, estado: 'aceptada' }, { receptor: req.userId, estado: 'aceptada' }]
    }).lean();

    const friendIds = friendships.map(f => f.solicitante.toString() === req.userId.toString() ? f.receptor : f.solicitante);
    
    // Identificar influencers entre amigos con UNA sola consulta
    let influencerIds = [];
    if (friendIds.length > 0) {
        try {
            const User = require('../models/User.model');
            const influencers = await User.find({
                _id: { $in: friendIds },
                'seguridad.rolSistema': { $in: ['Founder', 'admin', 'moderador'] }
            }).select('_id').lean();
            
            influencerIds = influencers.map(inf => inf._id.toString());
        } catch (dbErr) {
            console.error('⚠️ [FEED_METRIC] Error al consultar influencers en batch:', dbErr.message);
        }
    }

    // 3. Consultar posts de influencers (Fan-out on Read con RELEVANCE SORT)
    let influencerPosts = [];
    if (influencerIds.length > 0) {
        const influencerQuery = {
            usuario: { $in: influencerIds },
            privacidad: { $ne: 'privado' }
        };
        
        // Paginación por score si está presente
        if (lastScoreQuery) {
            influencerQuery.relevanceScore = { $lt: parseFloat(lastScoreQuery) };
        }
        
        influencerPosts = await Post.find(influencerQuery)
            .sort({ relevanceScore: -1, _id: -1 }) // Orden algorítmico
            .limit(safeLimit)
            .lean();
    }

    // 4. Mezclar, hidratar y devolver
    if ((cachedPostIds && cachedPostIds.length > 0) || influencerPosts.length > 0) {
        // Traer posts de normal friends que están en Redis
        const cachedPosts = cachedPostIds ? await Post.find({ _id: { $in: cachedPostIds } }).lean() : [];
        
        // Unir ambos sets (Normales de Redis + Influencers de Mongo)
        const allPosts = [...cachedPosts, ...influencerPosts];
        
        // Eliminar duplicados e hidratar
        const uniquePosts = Array.from(new Map(allPosts.map(p => [p._id.toString(), p])).values());
        
        const finalSortedPosts = uniquePosts
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, safeLimit);

        const hydratedPosts = await Post.populate(finalSortedPosts, [
            { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema' },
            { path: 'grupo', select: 'nombre tipo' },
            { path: 'postOriginal' },
            { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
        ]);

        const lastPost = hydratedPosts.length > 0 ? hydratedPosts[hydratedPosts.length - 1] : null;
        const nextCursor = lastPost ? {
            relevanceScore: lastPost.relevanceScore,
            id: lastPost._id
        } : null;

        console.log(`📊 [FEED_METRIC] Ranked Retrieval: Redis(${cachedPostIds?.length || 0}) + Influencers(${influencerPosts.length}) | user: ${req.userId}`);
        
        return res.json({
            success: true,
            message: 'Feed inteligente cargado',
            data: {
                posts: hydratedPosts,
                nextCursor,
                pagination: {
                    limit: safeLimit,
                    hasMore: hydratedPosts.length === safeLimit
                }
            }
        });
    }

    console.log(`📡 [FEED_METRIC] Fallback Pull total (No cached data) | user: ${req.userId}`);
    
    // [FALLBACK] Query MongoDB Completa (Pull Total)
    console.log(`📡 [FEED_METRIC] Fallback Pull total | user: ${req.userId}`);
    
    // Incluir el propio usuario en el feed
    const userIds = [req.userId, ...friendIds];

    // Obtener grupos del usuario
    const userGroups = await Group.find({
      'miembros.usuario': req.userId
    }).select('_id');

    const userGroupIds = userGroups.map(g => g._id);


    // Identificar usuarios con roles de sistema (Founder, admin, moderador)
    const User = require('../models/User.model');
    const systemRoles = ['Founder', 'admin', 'moderador'];
    const staffUsers = await User.find({
      'seguridad.rolSistema': { $in: systemRoles }
    }).select('_id');
    const staffIds = staffUsers.map(u => u._id);

    // Obtener publicaciones
    const query = {
      $or: [
        // 1. Posts de amigos en su perfil
        {
          usuario: { $in: friendIds },
          privacidad: { $in: ['publico', 'amigos'] },
          $or: [{ grupo: { $exists: false } }, { grupo: null }]
        },
        // 2. Mis posts
        { usuario: req.userId },
        // 3. Posts de grupos donde soy miembro
        {
          grupo: { $in: userGroupIds },
          privacidad: { $ne: 'privado' }
        },
        // 4. [GLOBAL FEED] Posts PÚBLICOS de Staff (Founder/Admin/Mod)
        // Esto permite mensajes de bienvenida globales y anuncios oficiales
        {
          usuario: { $in: staffIds },
          privacidad: 'publico',
          $or: [{ grupo: { $exists: false } }, { grupo: null }]
        }
      ]
    };

    // 🆕 MEJORA: Cursor Pagination con Feature Flag (Nivel FAANG: Tie-breaker con _id)
    const isCursorMode = process.env.USE_CURSOR_PAGINATION === 'true';

    if (isCursorMode && lastDate) {
      const originalOr = query.$or;
      delete query.$or;

      // El desempate por _id evita saltarse posts con el mismo score
      const cursorQuery = {
        $or: [
          { relevanceScore: { $lt: parseFloat(lastScoreQuery) } },
          {
            relevanceScore: parseFloat(lastScoreQuery),
            _id: { $lt: lastId }
          }
        ]
      };

      query.$and = [
        { $or: originalOr },
        cursorQuery
      ];
    }

    const sort = isCursorMode ? { relevanceScore: -1, _id: -1 } : { relevanceScore: -1 };
    const skipValue = isCursorMode ? 0 : (parseInt(page) - 1) * safeLimit;

    const posts = await Post.find(query)
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema')
      .populate('grupo', 'nombre tipo')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
      })
      .sort(sort)
      .limit(isCursorMode ? safeLimit + 1 : safeLimit) // 🆕 Traer 1 extra en modo cursor para hasMore real
      .skip(skipValue);

    // 🆕 OPTIMIZACIÓN: A escala masiva, countDocuments es muy lento.
    // Solo lo ejecutamos en modo legacy (page-based) para no romper el front actual.
    let total = 0;
    if (!isCursorMode) {
      total = await Post.countDocuments(query);
    }

    // 🆕 Lógica hasMore Nivel PRO: Validar contra el post extra
    const hasMore = isCursorMode ? posts.length > safeLimit : (posts.length === safeLimit);
    const finalPosts = isCursorMode ? posts.slice(0, safeLimit) : posts;

    // 🆕 MEJORA: Cursor de salida enriquecido sobre el set final de posts
    const lastPost = finalPosts.length > 0 ? finalPosts[finalPosts.length - 1] : null;
    const nextCursor = lastPost ? {
      relevanceScore: lastPost.relevanceScore,
      id: lastPost._id
    } : null;

    res.json({
      success: true,
      data: {
        posts: finalPosts,
        nextCursor,
        pagination: isCursorMode ? {
          limit: safeLimit,
          hasMore
        } : {
          total,
          page: parseInt(page),
          limit: safeLimit,
          pages: Math.ceil(total / safeLimit)
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
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema')
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
      // Defensive check: ensure miembros exists and is an array
      const members = Array.isArray(group.miembros) ? group.miembros : [];
      const isMember = members.some(m => m && m.usuario && m.usuario.equals(req.userId));

      // Defensive check: ensure creador exists
      const isCreator = group.creador && group.creador.equals(req.userId);

      if (!isMember && !isCreator) {
        return res.status(403).json(formatErrorResponse('No tienes acceso a las publicaciones de este grupo'));
      }
    }

    const skip = (page - 1) * limit;

    const query = {
      grupo: groupId,
      privacidad: { $ne: 'privado' }
    };

    const posts = await Post.find(query)
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema')
      .populate('grupo', 'nombre tipo')
      .populate('postOriginal')
      .populate({
        path: 'comentarios.usuario',
        select: 'nombres.primero apellidos.primero social.fotoPerfil'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments(query);

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
      .populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username seguridad.rolSistema')
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

    // 🆕 RESTRICT: Solo amigos pueden dar like (excepto staff, autor o post público del Founder)
    const canLike = await canInteractWithPost(req.userId, post.usuario, post, 'like');
    if (!canLike) {
      return res.status(403).json(formatErrorResponse('Debes ser amigo del autor para reaccionar a esta publicación'));
    }

    const likeIndex = post.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      // Quitar like
      post.likes.splice(likeIndex, 1);
      
      // ✅ FASE 1: Decrementar contador optimizado y borrar de colección espejo
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
      
      await Promise.all([
        post.save(),
        PostLike.findOneAndDelete({ post: id, usuario: req.userId }),
        feedService.syncPostScore(id) // 🔄 Actualizar ranking en Redis
      ]);

      // 🆕 ELIMINAR NOTIFICACIÓN EXISTENTE (si existe) V1 PRO
      try {
        await notificationService.deleteNotification({
          emisor: req.userId,
          receptor: post.usuario,
          tipo: 'like_post',
          'referencia.id': post._id
        });
      } catch (notifError) {
        console.error('⚠️ [UNLIKE] Error eliminando notificación:', notifError.message);
      }

      // Emitir actualización del post en tiempo real
      try {
        if (global.emitPostUpdate) {
          // Poblar antes de emitir
          await post.populate([
            { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil seguridad.rolSistema' },
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
      
      // ✅ FASE 1: Incrementar contador optimizado y guardar en colección espejo
      post.likesCount = (post.likesCount || 0) + 1;
      
      await Promise.all([
        post.save(),
        PostLike.create({ post: id, usuario: req.userId }),
        feedService.syncPostScore(id), // 🔄 Actualizar ranking en Redis
        feedService.boostAuthorInUserFeed(req.userId, post.usuario).catch(e => console.error('⚠️ [FEED_BOOST] Error:', e)) // 🚀 TikTok Boost
      ]);

      // 🏆 Notificación V1 PRO centralizada (evita duplicados si el servicio lo soporta o vía lógica simple)
      if (!post.usuario.equals(req.userId)) {
        notificationService.notify({
          receptorId: post.usuario,
          emisorId: req.userId,
          tipo: 'like_post',
          contenido: 'le dio like a tu publicación',
          referencia: { tipo: 'Post', id: post._id }
        }).catch(err => logger.error(`⚠️ [LIKE] Error en notificación: ${err.message}`));
      }

      // Emitir actualización del post en tiempo real
      try {
        if (global.emitPostUpdate) {
          // Poblar antes de emitir
          await post.populate([
            { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil seguridad.rolSistema' },
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

    // 🆕 RESTRICT: Solo amigos pueden comentar (excepto staff o autor)
    const canComment = await canInteractWithPost(req.userId, post.usuario, post, 'comment');
    if (!canComment) {
      return res.status(403).json(formatErrorResponse('Debes ser amigo del autor para comentar esta publicación'));
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
    
    // ✅ FASE 1: Incrementar contador optimizado
    post.commentsCount = (post.commentsCount || 0) + 1;
    
    await post.save();
    
    // 🔄 Actualizar ranking en Redis (Engagement incrementado) y aplicar Boost TikTok temporal
    feedService.syncPostScore(id).catch(e => console.error('⚠️ [SYNC_SCORE] Error:', e));
    feedService.boostAuthorInUserFeed(req.userId, post.usuario).catch(e => console.error('⚠️ [FEED_BOOST] Error:', e));

    // ✅ FASE 1: Guardar en colección espejo desacoplada
    const newDecoupledComment = await PostComment.create({
      post: id,
      usuario: req.userId,
      contenido: comment.contenido,
      image: comment.image,
      parentComment: comment.parentComment
    });

    // Poblar todo el post antes de emitir actualización global
    // Esto asegura que el frontend reciba datos consistentes (usuario poblado, grupo, etc.)
    await post.populate([
      { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil seguridad.rolSistema' },
      { path: 'grupo', select: 'nombre tipo' },
      { path: 'postOriginal' },
      { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
    ]);

    // Obtener el comentario recién creado (el último del array)
    const newComment = post.comentarios[post.comentarios.length - 1];


    // LÓGICA HÍBRIDA DE NOTIFICACIONES
    try {
      console.log('🔔 [ADD COMMENT] Iniciando lógica de notificaciones');
      console.log('🔔 [ADD COMMENT] Contenido del comentario:', contenido);

      // 1. Extraer menciones del contenido
      // ✅ CORREGIDO: Regex que captura puntos, guiones y guiones bajos (igual que en createPost)
      const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(contenido || '')) !== null) {
        mentions.push(match[1]);
      }
      const uniqueMentions = [...new Set(mentions)];

      console.log('🔔 [ADD COMMENT] Menciones extraídas:', uniqueMentions);

      // Array para trackear IDs de usuarios ya notificados (evitar duplicados)
      const notifiedUserIds = new Set();

      // 2. Si hay menciones, buscar usuarios y notificar
      if (uniqueMentions.length > 0) {
        console.log('🔍 [ADD COMMENT] Buscando usuarios mencionados en la base de datos (Case Insensitive)...');
        const UserV2 = require('../models/User.model');

        // Crear array de regex para búsqueda insensible a mayúsculas/minúsculas
        const mentionRegexes = uniqueMentions.map(m => new RegExp(`^${m}$`, 'i'));

        const mentionedUsers = await UserV2.find({
          username: { $in: mentionRegexes },
          _id: { $ne: req.userId } // No notificar al autor
        }).select('_id username');

        console.log(`✅ [ADD COMMENT] Usuarios encontrados: ${mentionedUsers.length}/${uniqueMentions.length}`);

        // Mapa para normalizar qué menciones se encontraron (para logs)
        const foundUsernamesLower = mentionedUsers.map(u => u.username.toLowerCase());

        mentionedUsers.forEach(u => {
          console.log(`   👤 Usuario encontrado: @${u.username} (ID: ${u._id})`);
        });

        // Detectar menciones no encontradas (Case Insensitive comparison)
        const notFoundMentions = uniqueMentions.filter(m => !foundUsernamesLower.includes(m.toLowerCase()));
        if (notFoundMentions.length > 0) {
          console.log(`⚠️ [ADD COMMENT] Menciones NO encontradas en DB:`, notFoundMentions);
        }

        // 1. Notificar Menciones
        for (const mentionedUser of mentionedUsers) {
          notificationService.notify({
            receptorId: mentionedUser._id,
            emisorId: req.userId,
            tipo: 'mencion',
            contenido: 'te mencionó en un comentario',
            referencia: { tipo: 'Post', id: post._id },
            metadata: { commentId: newComment._id }
          }).catch(err => logger.error(`⚠️ [COMMENT MENTION] Error: ${err.message}`));
          notifiedUserIds.add(mentionedUser._id.toString());
        }
      }

      // 2. Notificar Respuesta
      if (parentCommentId) {
        const parentComment = post.comentarios.id(parentCommentId);
        if (parentComment && parentComment.usuario) {
          const parentAuthorId = parentComment.usuario._id || parentComment.usuario;
          if (!parentAuthorId.equals(req.userId) && !notifiedUserIds.has(parentAuthorId.toString())) {
            notificationService.notify({
              receptorId: parentAuthorId,
              emisorId: req.userId,
              tipo: 'reply_comment',
              contenido: 'respondió a tu comentario',
              referencia: { tipo: 'Post', id: post._id },
              metadata: { commentId: newComment._id }
            }).catch(err => logger.error(`⚠️ [REPLY] Error: ${err.message}`));
            notifiedUserIds.add(parentAuthorId.toString());
          }
        }
      }

      // 3. Notificar al autor del post (si no fue notificado antes)
      const postAuthorId = post.usuario._id || post.usuario;
      if (postAuthorId && !postAuthorId.equals(req.userId) && !notifiedUserIds.has(postAuthorId.toString())) {
        notificationService.notify({
          receptorId: postAuthorId,
          emisorId: req.userId,
          tipo: 'comentario_post',
          contenido: 'comentó tu publicación',
          referencia: { tipo: 'Post', id: post._id },
          metadata: { commentId: newComment._id }
        }).catch(err => logger.error(`⚠️ [COMMENT POST] Error: ${err.message}`));
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
    // const newComment = post.comentarios[post.comentarios.length - 1]; // Already declared above

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

    // ✅ FASE 1: Incrementar contador de compartidos
    originalPost.sharesCount = (originalPost.sharesCount || 0) + 1;
    await originalPost.save();

    // 🆕 RESTRICT: Solo amigos pueden compartir (excepto staff o autor)
    const canShare = await canInteractWithPost(req.userId, originalPost.usuario);
    if (!canShare) {
      return res.status(403).json(formatErrorResponse('Debes ser amigo del autor para compartir esta publicación'));
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
    
    // 🔄 Actualizar ranking en Redis del post original
    feedService.syncPostScore(id).catch(e => console.error('⚠️ [SYNC_SCORE] Error:', e));

    // Poblar datos del post compartido
    await sharedPost.populate([
      { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' },
      {
        path: 'postOriginal',
        populate: { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
      }
    ]);

    // Notificación centralizada
    if (!originalPost.usuario.equals(req.userId)) {
      notificationService.notify({
        receptorId: originalPost.usuario,
        emisorId: req.userId,
        tipo: 'compartir_post',
        contenido: 'compartió tu publicación',
        referencia: { tipo: 'Post', id: originalPost._id }
      }).catch(err => logger.error(`⚠️ [SHARE] Notification error: ${err.message}`));
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

    // 🆕 ELIMINAR IMÁGENES DE R2 ANTES DE ELIMINAR EL POST
    try {
      const { extractR2UrlsFromPost, deleteMultipleFromR2 } = require('../utils/r2Helper');
      const r2Urls = extractR2UrlsFromPost(post);

      if (r2Urls.length > 0) {
        console.log(`🗑️ [DELETE POST] Eliminando ${r2Urls.length} archivo(s) de R2...`);
        const deleteResult = await deleteMultipleFromR2(r2Urls);
        console.log(`✅ [DELETE POST] R2 cleanup: ${deleteResult.success} éxitos, ${deleteResult.failed} fallos`);
      } else {
        console.log('ℹ️ [DELETE POST] No hay archivos de R2 para eliminar');
      }
    } catch (r2Error) {
      // No bloquear la eliminación del post si falla R2
      console.error('⚠️ [DELETE POST] Error al eliminar archivos de R2:', r2Error);
    }

    // 🚀 FASE 2: Invalidar en Redis (borrar de feeds)
    feedService.invalidatePost(id).catch(err => console.error('⚠️ [DELETE_FEED] Error:', err));

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


/**
 * Dar/quitar like a un comentario
 * POST /api/publicaciones/:id/comment/:commentId/like
 */
const toggleCommentLike = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(commentId)) {
      return res.status(400).json(formatErrorResponse('IDs inválidos'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    const comment = post.comentarios.id(commentId);
    if (!comment) {
      return res.status(404).json(formatErrorResponse('Comentario no encontrado'));
    }

    // Inicializar array si no existe
    if (!comment.likes) {
      comment.likes = [];
    }

    // Asegurarse de comparar ObjectId con string o ObjectId
    const likeIndex = comment.likes.findIndex(like => like.equals(req.userId));

    if (likeIndex > -1) {
      // Quitar like
      comment.likes.splice(likeIndex, 1);
      await post.save();

      // 🆕 ELIMINAR NOTIFICACIÓN EXISTENTE (si existe)
      try {
        const commentUserId = comment.usuario._id || comment.usuario;
        const deletedNotification = await Notification.findOneAndDelete({
          emisor: req.userId,
          receptor: commentUserId,
          tipo: 'like_comentario',
          'referencia.id': post._id
        });

        if (deletedNotification) {
          console.log('🗑️ [UNLIKE COMMENT] Notificación eliminada:', deletedNotification._id);
          // Emitir evento de eliminación de notificación
          if (global.emitNotification) {
            global.emitNotification(commentUserId.toString(), {
              tipo: 'notificacion_eliminada',
              notificacionId: deletedNotification._id
            });
          }
        }
      } catch (notifError) {
        console.error('⚠️ [UNLIKE COMMENT] Error eliminando notificación:', notifError);
      }
    } else {
      // Dar like
      comment.likes.push(req.userId);
      await post.save();

      // 🏆 Notificación V1 PRO
      const commentUserId = comment.usuario._id || comment.usuario;
      if (commentUserId && !commentUserId.equals(req.userId)) {
        notificationService.notify({
          receptorId: commentUserId,
          emisorId: req.userId,
          tipo: 'like_comentario',
          contenido: 'le dio like a tu comentario',
          referencia: { tipo: 'Post', id: post._id }
        }).catch(err => logger.error(`⚠️ [LIKE COMMENT] Error: ${err.message}`));
      }
    }

    // Emitir actualización del post
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
      console.error('⚠️ [COMMENT LIKE] Socket emit error:', socketError);
    }

    return res.json(formatSuccessResponse('Like actualizado', {
      liked: likeIndex === -1,
      totalLikes: comment.likes.length
    }));

  } catch (error) {
    console.error('Error al dar like a comentario:', error);
    res.status(500).json(formatErrorResponse('Error al procesar like de comentario', [error.message]));
  }
};

/**
 * Actualizar publicación
 * PUT /api/publicaciones/:id
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    // Verificar que el usuario sea el dueño del post
    if (!post.usuario.equals(req.userId)) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para editar esta publicación'));
    }

    // Actualizar contenido
    post.contenido = contenido;

    // Si se enviaron etiquetas nuevas
    if (req.body.etiquetas) {
      post.etiquetas = req.body.etiquetas.split(',').map(t => t.trim());
    }

    await post.save();

    // Poblar respuesta
    await post.populate('usuario', 'nombres.primero apellidos.primero social.fotoPerfil username');
    await post.populate('grupo', 'nombre tipo');

    // Emitir socket
    try {
      if (global.emitPostUpdate) {
        global.emitPostUpdate(post);
      }
    } catch (socketError) {
      console.error('⚠️ [UPDATE POST] Socket emit error:', socketError);
    }

    // 🔔 NOTIFICAR MENCIONES EN EDICIÓN
    try {
      console.log('🔔 [UPDATE POST] Checking for mentions in edit...');
      const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
      const extractedMentions = (contenido || '').match(mentionRegex);

      if (extractedMentions && extractedMentions.length > 0) {
        const uniqueMentions = [...new Set(extractedMentions)].map(m => m.slice(1));
        const User = require('../models/User.model');

        const mentionedUsers = await User.find({
          $or: [
            { 'social.username': { $in: uniqueMentions } },
            { 'username': { $in: uniqueMentions } }
          ],
          _id: { $ne: req.userId }
        }).select('_id username social.username');

        for (const user of mentionedUsers) {
          notificationService.notify({
            receptorId: user._id,
            emisorId: req.userId,
            tipo: 'post_editado',
            contenido: 'editó la publicación',
            referencia: { tipo: 'Post', id: post._id }
          }).catch(err => logger.error(`⚠️ [EDIT MENTION] Error: ${err.message}`));
        }
      }
    } catch (notifError) {
      console.error('⚠️ [UPDATE POST] Notification error:', notifError);
    }

    res.json(formatSuccessResponse('Publicación actualizada correctamente', post));
  } catch (error) {
    console.error('Error al actualizar publicación:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar publicación', [error.message]));
  }
};

/**
 * Eliminar comentario
 * DELETE /api/publicaciones/:id/comment/:commentId
 */
const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(commentId)) {
      return res.status(400).json(formatErrorResponse('IDs inválidos'));
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    const comment = post.comentarios.id(commentId);
    if (!comment) {
      return res.status(404).json(formatErrorResponse('Comentario no encontrado'));
    }

    // Verificar que sea el autor del comentario, el autor del post, o admin
    const commentUserId = comment.usuario._id || comment.usuario;
    const isCommentAuthor = commentUserId.equals(req.userId);
    const isPostAuthor = post.usuario.equals(req.userId);
    const isAdmin = req.user.rol === 'admin';

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este comentario'));
    }

    // 🆕 ELIMINAR IMAGEN DE R2 SI EXISTE
    try {
      const { extractR2UrlFromComment, deleteMultipleFromR2 } = require('../utils/r2Helper');
      const r2Url = extractR2UrlFromComment(comment);

      if (r2Url) {
        console.log(`🗑️ [DELETE COMMENT] Eliminando imagen de R2: ${r2Url}`);
        await deleteMultipleFromR2([r2Url]);
        console.log(`✅ [DELETE COMMENT] Imagen eliminada de R2`);
      }
    } catch (r2Error) {
      // No bloquear la eliminación del comentario si falla R2
      console.error('⚠️ [DELETE COMMENT] Error al eliminar imagen de R2:', r2Error);
    }

    // Eliminar el comentario del array
    comment.deleteOne();
    await post.save();

    // Poblar el post antes de emitir
    await post.populate([
      { path: 'usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil username' },
      { path: 'grupo', select: 'nombre tipo' },
      { path: 'postOriginal' },
      { path: 'comentarios.usuario', select: 'nombres.primero apellidos.primero social.fotoPerfil' }
    ]);

    // Emitir actualización del post
    try {
      if (global.emitPostUpdate) {
        global.emitPostUpdate(post);
      }
    } catch (socketError) {
      console.error('⚠️ [DELETE COMMENT] Socket emit error:', socketError);
    }

    res.json(formatSuccessResponse('Comentario eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar comentario', [error.message]));
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  getGroupPosts,
  getPostById,
  toggleLike,
  toggleCommentLike,
  addComment,
  sharePost,
  deletePost,
  updatePost,
  deleteComment
};
