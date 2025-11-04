const User = require('../models/User');

class UserService {
  /**
   * Obtener usuario por ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId).populate('area');

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Obtener todos los usuarios (con paginación)
   */
  async getAllUsers(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;

    const query = { activo: true, ...filters };

    const users = await User.find(query)
      .select('-password')
      .populate('area')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Buscar usuarios por nombre o email
   */
  async searchUsers(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const users = await User.find({
      $or: [
        { nombre: { $regex: query, $options: 'i' } },
        { apellido: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      activo: true
    })
      .select('-password')
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments({
      $or: [
        { nombre: { $regex: query, $options: 'i' } },
        { apellido: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      activo: true
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Actualizar perfil de usuario
   */
  async updateProfile(userId, updateData) {
    // Campos que no se pueden actualizar directamente
    const restrictedFields = ['password', 'email', 'rol'];
    restrictedFields.forEach(field => delete updateData[field]);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('area');

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Actualizar avatar
   */
  async updateAvatar(userId, avatarUrl) {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Desactivar usuario
   */
  async deactivateUser(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { activo: false },
      { new: true }
    );

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return { message: 'Usuario desactivado exitosamente' };
  }

  /**
   * Obtener usuarios por área
   */
  async getUsersByArea(areaId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const users = await User.find({ area: areaId, activo: true })
      .select('-password')
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments({ area: areaId, activo: true });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new UserService();
