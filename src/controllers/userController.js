const User = require('../models/User.model');
const Friendship = require('../models/Friendship'); // Importar Friendship
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');
const path = require('path');
const fs = require('fs');

/**
 * Obtener todos los usuarios (con paginación)
 * GET /api/usuarios
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado = 'activo' } = req.query;

    const skip = (page - 1) * limit;

    const users = await User.find({ estado })
      .select('-password')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ estado });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json(formatErrorResponse('Error al obtener usuarios', [error.message]));
  }
};

/**
 * Buscar usuarios por nombre, apellido o email
 * GET /api/usuarios/search?q=texto
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json(formatErrorResponse('Parámetro de búsqueda requerido'));
    }

    const searchRegex = new RegExp(q, 'i'); // Case insensitive

    const users = await User.find({
      $or: [
        { 'nombres.primero': searchRegex },
        { 'nombres.segundo': searchRegex },
        { 'apellidos.primero': searchRegex },
        { 'apellidos.segundo': searchRegex },
        { email: searchRegex },
        { 'social.username': searchRegex }
      ],
      'seguridad.estadoCuenta': 'activo' // Usar el campo correcto para estado
    })
      .select('nombres.primero nombres.segundo apellidos.primero apellidos.segundo email social.fotoPerfil social.username') // Seleccionar campos específicos de UserV2
      .limit(20);

    res.json(formatSuccessResponse('Búsqueda completada', users));
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json(formatErrorResponse('Error al buscar usuarios', [error.message]));
  }
};

/**
 * Obtener usuario por ID
 * GET /api/usuarios/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    // Verificar si hay bloqueo
    const currentUserId = req.user ? req.user._id : null;
    if (currentUserId && currentUserId.toString() !== id) {
      const blockedFriendship = await Friendship.findOne({
        $or: [
          { solicitante: currentUserId, receptor: id, estado: 'bloqueada' },
          { solicitante: id, receptor: currentUserId, estado: 'bloqueada' }
        ]
      });

      if (blockedFriendship) {
        // Retornar 404 para simular que el usuario no existe (invisibilidad)
        return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
      }
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    res.json(formatSuccessResponse('Usuario encontrado', user));
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json(formatErrorResponse('Error al obtener usuario', [error.message]));
  }
};

/**
 * Actualizar perfil del usuario autenticado
 * PUT /api/usuarios/profile
 */
const updateProfile = async (req, res) => {
  try {
    const updates = {};

    // Actualizar nombres si se proporcionan
    if (req.body.nombres) {
      if (req.body.nombres.primero !== undefined) {
        updates['nombres.primero'] = req.body.nombres.primero;
      }
      if (req.body.nombres.segundo !== undefined) {
        updates['nombres.segundo'] = req.body.nombres.segundo;
      }
    }

    // Actualizar apellidos si se proporcionan
    if (req.body.apellidos) {
      if (req.body.apellidos.primero !== undefined) {
        updates['apellidos.primero'] = req.body.apellidos.primero;
      }
      if (req.body.apellidos.segundo !== undefined) {
        updates['apellidos.segundo'] = req.body.apellidos.segundo;
      }
    }

    // Actualizar información personal
    if (req.body.personal) {
      if (req.body.personal.fechaNacimiento !== undefined) {
        updates['personal.fechaNacimiento'] = req.body.personal.fechaNacimiento;
      }
      if (req.body.personal.genero !== undefined) {
        updates['personal.genero'] = req.body.personal.genero;
      }
      if (req.body.personal.celular !== undefined) {
        updates['personal.celular'] = req.body.personal.celular;
      }
      if (req.body.personal.telefonoFijo !== undefined) {
        updates['personal.telefonoFijo'] = req.body.personal.telefonoFijo;
      }
      if (req.body.personal.direccion !== undefined) {
        updates['personal.direccion'] = req.body.personal.direccion;
      }

      // Actualizar ubicación dentro de personal
      if (req.body.personal.ubicacion) {
        if (req.body.personal.ubicacion.pais !== undefined) {
          updates['personal.ubicacion.pais'] = req.body.personal.ubicacion.pais;
        }
        if (req.body.personal.ubicacion.estado !== undefined) {
          updates['personal.ubicacion.estado'] = req.body.personal.ubicacion.estado;
        }
        if (req.body.personal.ubicacion.ciudad !== undefined) {
          updates['personal.ubicacion.ciudad'] = req.body.personal.ubicacion.ciudad;
        }
        if (req.body.personal.ubicacion.barrio !== undefined) {
          updates['personal.ubicacion.barrio'] = req.body.personal.ubicacion.barrio;
        }
        if (req.body.personal.ubicacion.codigoPostal !== undefined) {
          updates['personal.ubicacion.codigoPostal'] = req.body.personal.ubicacion.codigoPostal;
        }
        if (req.body.personal.ubicacion.coordenadas) {
          updates['personal.ubicacion.coordenadas'] = req.body.personal.ubicacion.coordenadas;
        }
      }
    }

    // Actualizar perfil social (biografía, sitio web, privacidad)
    if (req.body.social) {
      if (req.body.social.biografia !== undefined) {
        updates['social.biografia'] = req.body.social.biografia;
      }
      if (req.body.social.sitioWeb !== undefined) {
        updates['social.sitioWeb'] = req.body.social.sitioWeb;
      }
      if (req.body.social.username !== undefined) {
        updates['social.username'] = req.body.social.username;
      }

      // Actualizar configuración de privacidad
      if (req.body.social.privacidad) {
        updates['social.privacidad'] = {
          ...updates['social.privacidad'],
          ...req.body.social.privacidad
        };
      }
    }

    // Actualizar flag de miembro fundación
    if (req.body.esMiembroFundacion !== undefined) {
      updates['esMiembroFundacion'] = req.body.esMiembroFundacion;
    }

    // Actualizar perfil de fundación si se proporciona
    if (req.body.fundacion) {
      // Si no es el Founder, cualquier cambio requiere nueva aprobación
      if (req.user?.seguridad?.rolSistema !== 'Founder') {
        updates['fundacion.estadoAprobacion'] = 'pendiente';
      }

      if (req.body.fundacion.codigoEmpleado !== undefined) {
        updates['fundacion.codigoEmpleado'] = req.body.fundacion.codigoEmpleado;
      }
      if (req.body.fundacion.nivel !== undefined) {
        updates['fundacion.nivel'] = req.body.fundacion.nivel;
      }
      if (req.body.fundacion.area !== undefined) {
        updates['fundacion.area'] = req.body.fundacion.area;
      }
      if (req.body.fundacion.cargo !== undefined) {
        updates['fundacion.cargo'] = req.body.fundacion.cargo;
      }
      if (req.body.fundacion.territorio) {
        updates['fundacion.territorio'] = req.body.fundacion.territorio;
      }
    }

    // Actualizar perfil eclesiástico si se proporciona
    if (req.body.eclesiastico) {
      if (req.body.eclesiastico.iglesia !== undefined) {
        updates['eclesiastico.iglesia'] = req.body.eclesiastico.iglesia;
      }
      if (req.body.eclesiastico.rolPrincipal !== undefined) {
        updates['eclesiastico.rolPrincipal'] = req.body.eclesiastico.rolPrincipal;
      }
      if (req.body.eclesiastico.ministerios) {
        updates['eclesiastico.ministerios'] = req.body.eclesiastico.ministerios;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    res.json(formatSuccessResponse('Perfil actualizado exitosamente', user));
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar perfil', [error.message]));
  }
};

/**
 * Subir avatar
 * PUT /api/usuarios/avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(formatErrorResponse('No se proporcionó ningún archivo'));
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Eliminar avatar anterior si existe
    const oldAvatar = user.social?.fotoPerfil;
    if (oldAvatar) {
      const oldAvatarPath = path.join(process.cwd(), oldAvatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Actualizar avatar en el perfil social
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Inicializar social si no existe
    if (!user.social) {
      user.social = {};
    }

    user.social.fotoPerfil = avatarUrl;
    await user.save();

    res.json(formatSuccessResponse('Avatar actualizado exitosamente', { avatar: avatarUrl }));
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json(formatErrorResponse('Error al subir avatar', [error.message]));
  }
};

/**
 * Subir banner/portada
 * POST /api/usuarios/:id/banner
 */
const uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(formatErrorResponse('No se proporcionó ningún archivo'));
    }

    const { id } = req.params;

    // Verificar que el usuario está actualizando su propio banner o es admin
    if (req.userId !== id && req.user?.seguridad?.rolSistema !== 'admin') {
      return res.status(403).json(formatErrorResponse('No tienes permiso para actualizar este banner'));
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Eliminar banner anterior si existe
    const oldBanner = user.social?.fotoBanner;
    if (oldBanner) {
      const oldBannerPath = path.join(process.cwd(), oldBanner);
      if (fs.existsSync(oldBannerPath)) {
        fs.unlinkSync(oldBannerPath);
      }
    }

    // Actualizar banner en el perfil social
    const bannerUrl = `/uploads/banners/${req.file.filename}`;

    // Inicializar social si no existe
    if (!user.social) {
      user.social = {};
    }

    user.social.fotoBanner = bannerUrl;
    await user.save();

    res.json(formatSuccessResponse('Banner actualizado exitosamente', { banner: bannerUrl }));
  } catch (error) {
    console.error('Error al subir banner:', error);
    res.status(500).json(formatErrorResponse('Error al subir banner', [error.message]));
  }
};

/**
 * Eliminar banner/portada
 * DELETE /api/usuarios/:id/banner
 */
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario está eliminando su propio banner o es admin
    if (req.userId !== id && req.user?.seguridad?.rolSistema !== 'admin') {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este banner'));
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Eliminar archivo del banner si existe
    const banner = user.social?.fotoBanner;
    if (banner) {
      const bannerPath = path.join(process.cwd(), banner);
      if (fs.existsSync(bannerPath)) {
        fs.unlinkSync(bannerPath);
      }
    }

    // Actualizar usuario
    if (user.social) {
      user.social.fotoBanner = null;
      await user.save();
    }

    res.json(formatSuccessResponse('Banner eliminado exitosamente'));
  } catch (error) {
    console.error('Error al eliminar banner:', error);
    res.status(500).json(formatErrorResponse('Error al eliminar banner', [error.message]));
  }
};

/**
 * Desactivar cuenta
 * DELETE /api/usuarios/deactivate
 */
const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    user.estado = 'inactivo';
    await user.save();

    res.json(formatSuccessResponse('Cuenta desactivada exitosamente'));
  } catch (error) {
    console.error('Error al desactivar cuenta:', error);
    res.status(500).json(formatErrorResponse('Error al desactivar cuenta', [error.message]));
  }
};

/**
 * Obtener estadísticas del usuario
 * GET /api/usuarios/:id/stats
 */
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json(formatErrorResponse('ID inválido'));
    }

    const Post = require('../models/Post');
    const Friendship = require('../models/Friendship');

    const [totalPosts, totalAmigos] = await Promise.all([
      Post.countDocuments({ usuario: id }),
      Friendship.countDocuments({
        $or: [
          { solicitante: id, estado: 'aceptada' },
          { receptor: id, estado: 'aceptada' }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPosts,
        totalAmigos
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json(formatErrorResponse('Error al obtener estadísticas', [error.message]));
  }
};

/**
 * Guardar/Desguardar una publicación
 * POST /api/usuarios/save-post/:postId
 */
const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      return res.status(400).json(formatErrorResponse('ID de publicación inválido'));
    }

    const Post = require('../models/Post');

    // Verificar que el post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json(formatErrorResponse('Publicación no encontrada'));
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Verificar si ya está guardado
    const isSaved = user.savedPosts.includes(postId);

    if (isSaved) {
      // Quitar de guardados
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
      await user.save();

      res.json(formatSuccessResponse('Publicación eliminada de guardados', {
        saved: false,
        savedPosts: user.savedPosts
      }));
    } else {
      // Agregar a guardados
      user.savedPosts.push(postId);
      await user.save();

      res.json(formatSuccessResponse('Publicación guardada exitosamente', {
        saved: true,
        savedPosts: user.savedPosts
      }));
    }
  } catch (error) {
    console.error('Error al guardar publicación:', error);
    res.status(500).json(formatErrorResponse('Error al guardar publicación', [error.message]));
  }
};

/**
 * Obtener publicaciones guardadas del usuario
 * GET /api/usuarios/saved-posts
 */
const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate({
        path: 'savedPosts',
        populate: {
          path: 'usuario',
          select: 'nombres apellidos social.fotoPerfil email'
        }
      });

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    res.json(formatSuccessResponse('Posts guardados obtenidos', {
      posts: user.savedPosts || [],
      total: user.savedPosts?.length || 0
    }));
  } catch (error) {
    console.error('Error al obtener posts guardados:', error);
    res.status(500).json(formatErrorResponse('Error al obtener posts guardados', [error.message]));
  }
};

module.exports = {
  getAllUsers,
  searchUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
  uploadBanner,
  deleteBanner,
  deactivateAccount,
  getUserStats,
  toggleSavePost,
  getSavedPosts
};
