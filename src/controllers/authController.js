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
 * Dividir nombre completo en primero y segundo
 * Ejemplo: "Nahuel Edgardo" => { primero: "Nahuel", segundo: "Edgardo" }
 * Ejemplo: "Juan" => { primero: "Juan", segundo: "" }
 * Ejemplo: "María José Teresa" => { primero: "María", segundo: "José Teresa" }
 */
const splitFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { primero: '', segundo: '' };
  }

  const parts = fullName.trim().split(/\s+/); // Dividir por espacios

  if (parts.length === 0) {
    return { primero: '', segundo: '' };
  } else if (parts.length === 1) {
    return { primero: parts[0], segundo: '' };
  } else {
    // Primer parte va a "primero", el resto va a "segundo"
    return {
      primero: parts[0],
      segundo: parts.slice(1).join(' ')
    };
  }
};


// Función auxiliar para generar username único
const generateUniqueUsername = async (nombre, apellido) => {
  let baseUsername = `${nombre.toLowerCase()}.${apellido.toLowerCase()}`.replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
  let username = baseUsername;
  let counter = 1;

  while (await User.findOne({ 'social.username': username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  return username;
};

/**
 * Registro de usuario
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, fechaNacimiento } = req.body;

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

    // Dividir nombres y apellidos automáticamente
    const nombresObj = splitFullName(nombre);
    const apellidosObj = splitFullName(apellido);

    // Generar username único
    const username = await generateUniqueUsername(nombre, apellido);

    console.log('📝 Nombres divididos:', nombresObj);
    console.log('📝 Apellidos divididos:', apellidosObj);
    console.log('📝 Username generado:', username);

    // Crear usuario con nueva estructura
    // NOTA: NO hasheamos la contraseña aquí porque el middleware pre('save') del modelo lo hace automáticamente
    const user = new User({
      nombres: nombresObj,
      apellidos: apellidosObj,
      email: email.toLowerCase(),
      password: password, // ← Contraseña en texto plano, el modelo la hasheará
      personal: {
        fechaNacimiento: fechaNacimiento,
        ubicacion: {}
      },
      social: {
        username: username // Guardar username generado
      },
      seguridad: {
        estadoCuenta: 'activo',
        rolSistema: 'usuario'
      }
    });

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
  console.log('🔐 ===== INICIO LOGIN =====');
  console.log('📥 Request recibido:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: { email: req.body.email, password: '***' }
  });

  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      console.log('❌ Validación fallida: Campos faltantes');
      return res.status(400).json(formatErrorResponse('Email y contraseña son obligatorios'));
    }

    console.log('🔍 Buscando usuario con email:', email.toLowerCase());

    // Buscar usuario (incluir password)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ Usuario no encontrado para email:', email.toLowerCase());
      return res.status(401).json(formatErrorResponse('Credenciales inválidas'));
    }

    console.log('✅ Usuario encontrado:', {
      id: user._id,
      email: user.email,
      nombre: `${user.nombres.primero} ${user.apellidos.primero}`,
      rolSistema: user.seguridad?.rolSistema
    });

    // Verificar contraseña con argon2
    console.log('🔑 Verificando contraseña...');
    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      console.log('❌ Contraseña inválida para usuario:', email);
      return res.status(401).json(formatErrorResponse('Credenciales inválidas'));
    }

    console.log('✅ Contraseña válida');

    // Generar token
    console.log('🎫 Generando token JWT...');
    const token = generateToken(user._id);
    console.log('✅ Token generado');

    // Remover password de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('📤 Enviando respuesta exitosa');
    console.log('🔐 ===== FIN LOGIN EXITOSO =====\n');

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('💥 ERROR EN LOGIN:', error);
    console.error('Stack trace:', error.stack);
    console.log('🔐 ===== FIN LOGIN CON ERROR =====\n');
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

    // Asignar nueva contraseña (el middleware pre('save') la hasheará automáticamente)
    user.password = newPassword;
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