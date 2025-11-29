const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { validateRegisterData, formatErrorResponse, formatSuccessResponse } = require('../utils/validators');

/**
 * Generar JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Registro de usuario
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, legajo, area, cargo } = req.body;

    // Validar datos
    const validation = validateRegisterData(req.body);
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse('Datos inválidos', validation.errors));
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json(formatErrorResponse('El email ya está registrado'));
    }

    // Hash de la contraseña con argon2
    const hashedPassword = await argon2.hash(password);

    // Crear usuario con nueva estructura
    const user = new User({
      nombres: { primero: nombre },
      apellidos: { primero: apellido },
      email: email.toLowerCase(),
      password: hashedPassword,
      personal: {
        ubicacion: {}
      },
      social: {},
      seguridad: {
        estadoCuenta: 'activo',
        rolSistema: 'usuario'
      }
    });

    // Si vienen datos de fundación, agregarlos
    if (legajo || area || cargo) {
      user.esMiembroFundacion = true;
      user.fundacion = {
        activo: true,
        codigoEmpleado: legajo,
        area: area,
        cargo: cargo
      };
    }

    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Remover password de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json(formatErrorResponse('Error al registrar usuario', [error.message]));
  }
};

/**
 * Login de usuario
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json(formatErrorResponse('Email y contraseña son obligatorios'));
    }

    // Buscar usuario (incluir password)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json(formatErrorResponse('Credenciales inválidas'));
    }

    // Generar token
    const token = generateToken(user._id);

    // Remover password de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json(formatErrorResponse('Error al iniciar sesión', [error.message]));
  }
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    res.json(formatSuccessResponse('Perfil obtenido', user));
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json(formatErrorResponse('Error al obtener perfil', [error.message]));
  }
};

/**
 * Cambiar contraseña
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(formatErrorResponse('Contraseña actual y nueva son obligatorias'));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(formatErrorResponse('La nueva contraseña debe tener al menos 6 caracteres'));
    }

    // Buscar usuario con contraseña
    const user = await User.findById(req.userId).select('+password');

    // Verificar contraseña actual
    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json(formatErrorResponse('Contraseña actual incorrecta'));
    }

    // Hash de la nueva contraseña
    user.password = await argon2.hash(newPassword);
    await user.save();

    res.json(formatSuccessResponse('Contraseña actualizada exitosamente'));
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json(formatErrorResponse('Error al cambiar contraseña', [error.message]));
  }
};

/**
 * Logout (lado servidor - opcional)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // En un sistema JWT sin blacklist, el logout se maneja en el cliente
    // Aquí podríamos registrar el evento o limpiar datos de sesión si fuera necesario

    res.json(formatSuccessResponse('Logout exitoso'));
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json(formatErrorResponse('Error al cerrar sesión', [error.message]));
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  logout
};