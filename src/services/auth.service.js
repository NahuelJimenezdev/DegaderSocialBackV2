const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const User = require('../models/User');

class AuthService {
  /**
   * Registrar nuevo usuario
   */
  async register(userData) {
    const { nombre, apellido, email, password } = userData;

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hashear contraseña con argon2
    const hashedPassword = await argon2.hash(password);

    // Crear usuario
    const user = new User({
      nombre,
      apellido,
      email,
      password: hashedPassword,
      ...userData
    });

    await user.save();

    // Generar token
    const token = this.generateToken(user._id);

    return {
      user: user.getPublicProfile(),
      token
    };
  }

  /**
   * Login de usuario
   */
  async login(email, password) {
    // Buscar usuario (incluir password)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await argon2.verify(user.password, password);

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new Error('Usuario inactivo');
    }

    // Generar token
    const token = this.generateToken(user._id);

    return {
      user: user.getPublicProfile(),
      token
    };
  }

  /**
   * Generar JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verificar token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isValid = await argon2.verify(user.password, oldPassword);

    if (!isValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Hashear nueva contraseña
    user.password = await argon2.hash(newPassword);
    await user.save();

    return { message: 'Contraseña actualizada exitosamente' };
  }
}

module.exports = new AuthService();
