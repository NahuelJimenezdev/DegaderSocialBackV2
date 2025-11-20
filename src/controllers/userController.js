const User = require('../models/User');
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
        { nombre: searchRegex },
        { apellido: searchRegex },
        { email: searchRegex },
        { legajo: searchRegex }
      ],
      estado: 'activo'
    })
      .select('-password -estado -__v')
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
    const allowedFields = ['nombre', 'apellido', 'biografia', 'telefono', 'ciudad', 'fechaNacimiento', 'legajo', 'area', 'cargo'];
    const updates = {};

    // Filtrar solo campos permitidos
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Actualizar configuración de privacidad si se proporciona
    if (req.body.privacidad) {
      updates.privacidad = {
        ...updates.privacidad,
        ...req.body.privacidad
      };
    }

    // Actualizar ubicación si se proporciona
    if (req.body.ubicacion) {
      updates.ubicacion = {
        pais: req.body.ubicacion.pais,
        ciudad: req.body.ubicacion.ciudad,
        subdivision: req.body.ubicacion.subdivision,
        paisCode: req.body.ubicacion.paisCode || 'AR'
      };
    }

    // Actualizar información ministerial si se proporciona
    if (req.body.ministerio) {
      updates.ministerio = {
        pastor: req.body.ministerio.pastor,
        iglesiaNombre: req.body.ministerio.iglesiaNombre,
        denominacion: req.body.ministerio.denominacion,
        direccionMinisterio: req.body.ministerio.direccionMinisterio,
        rolMinisterio: req.body.ministerio.rolMinisterio
      };
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

    // Eliminar avatar anterior si existe
    if (user.avatar) {
      const oldAvatarPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Actualizar avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
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
    if (req.userId !== id && req.user.rol !== 'admin') {
      return res.status(403).json(formatErrorResponse('No tienes permiso para actualizar este banner'));
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Eliminar banner anterior si existe
    if (user.banner) {
      const oldBannerPath = path.join(process.cwd(), user.banner);
      if (fs.existsSync(oldBannerPath)) {
        fs.unlinkSync(oldBannerPath);
      }
    }

    // Actualizar banner
    const bannerUrl = `/uploads/banners/${req.file.filename}`;
    user.banner = bannerUrl;
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
    if (req.userId !== id && req.user.rol !== 'admin') {
      return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este banner'));
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Eliminar archivo del banner si existe
    if (user.banner) {
      const bannerPath = path.join(process.cwd(), user.banner);
      if (fs.existsSync(bannerPath)) {
        fs.unlinkSync(bannerPath);
      }
    }

    // Actualizar usuario
    user.banner = null;
    await user.save();

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
          select: 'nombre apellido avatar'
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
