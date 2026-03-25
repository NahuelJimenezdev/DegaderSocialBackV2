const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { validateRegisterData, formatErrorResponse, formatSuccessResponse } = require('../utils/validators');
const logger = require('../config/logger');
const { sendWelcomeEmail } = require('../services/emailService');

/**
 * Generar JWT token enriquecido con role y versión para cache de auth
 * @param {Object} user - Documento del usuario (debe tener _id, seguridad.rolSistema, __v)
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.seguridad?.rolSistema || 'usuario',
      v: user.__v ?? 0
    },
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

  while (await User.findOne({ username: username })) {
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
    const { nombre, apellido, email, password, fechaNacimiento, genero, pais, ciudad, estado } = req.body;

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



    // Lógica especial para el Founder (Super Admin Automático)
    let seguridadConfig = {
      estadoCuenta: 'activo',
      rolSistema: 'usuario'
    };

    let esMiembroFundacion = false;
    let fundacionConfig = undefined;

    if (email?.trim()?.toLowerCase() === 'founderdegader@degadersocial.com') {
      console.log('👑 REGISTRO DE FOUNDER DETECTADO: Asignando permisos totales');
      seguridadConfig = {
        estadoCuenta: 'activo',
        rolSistema: 'Founder',
        verificado: true,
        permisos: {
          crearEventos: true,
          gestionarUsuarios: true,
          gestionarFinanzas: true,
          publicarNoticias: true,
          accesoPanelAdmin: true,
          moderarContenido: true
        }
      };

      // Auto-inicializar perfil de fundación aprobado para evitar errores
      esMiembroFundacion = true;
      fundacionConfig = {
        activo: true,
        nivel: 'directivo_general',
        area: 'Dirección Ejecutiva',
        cargo: 'Director General (Pastor)',
        estadoAprobacion: 'aprobado',
        fechaIngreso: new Date(),
        fechaAprobacion: new Date()
      };
    }

    // Crear usuario con nueva estructura
    // NOTA: NO hasheamos la contraseña aquí porque el middleware pre('save') del modelo lo hace automáticamente
    const user = new User({
      nombres: nombresObj,
      apellidos: apellidosObj,
      email: email.toLowerCase(),
      password: password, // ← Contraseña en texto plano, el modelo la hasheará
      username: username, // Username en campo raíz
      esMiembroFundacion: esMiembroFundacion,
      fundacion: fundacionConfig,
      personal: {
        fechaNacimiento: fechaNacimiento,
        genero: genero || 'Otro', // Default a 'Otro' si no viene, aunque el validador lo exige
        ubicacion: {
          pais: pais,
          ciudad: ciudad,
          estado: estado // Provincia/Estado opcional o requerido según frontend
        }
      },
      seguridad: seguridadConfig
    });

    await user.save();

    // 📧 Enviar correo de bienvenida (sin bloquear la respuesta)
    sendWelcomeEmail(user).catch(err => console.error('📧 [EMAIL] Error enviando bienvenida:', err));

    // Generar token
    const token = generateToken(user);

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

    logger.info(`[LOGIN-AUDIT] 🚀 Iniciando proceso para email: ${email}`);

    // FASE 1: Query rápida vía Driver Directo (Bypasses Mongoose overhead)
    let authUser;
    const MAX_RETRIES = 2;
    const PROJECTION = { _id: 1, email: 1, seguridad: 1, password: 1, __v: 1 };
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[LOGIN-AUDIT] 🔍 Intentando query Mongo directo (Intento ${attempt})...`);
        const startTime = Date.now();
        
        // Usar .collection.findOne bypasses Mongoose hydration/logic (vuela en Atlas M0)
        authUser = await User.collection.findOne(
          { email: email.toLowerCase() },
          { projection: PROJECTION, maxTimeMS: 8000 }
        );
        
        const duration = Date.now() - startTime;
        logger.info(`[LOGIN-AUDIT] ✅ Query completada en ${duration}ms. Encontrado: ${!!authUser}`);
        break;
      } catch (dbError) {
        if (attempt < MAX_RETRIES && (dbError.message?.includes('timed out') || dbError.name === 'MongoNetworkTimeoutError' || dbError.name === 'MongoServerSelectionError')) {
          logger.warn(`[LOGIN] ⚠️ Intento ${attempt}/${MAX_RETRIES} falló (timeout), reintentando en 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw dbError;
      }
    }

    if (!authUser) {
      return res.status(401).json(formatErrorResponse('Credenciales inválidas'));
    }

    // Validar que el usuario tiene password hasheado (protección contra datos corruptos)
    if (!authUser.password) {
      logger.error(`[LOGIN] Usuario ${authUser._id} sin password hasheado — posible dato corrupto`);
      return res.status(500).json(formatErrorResponse('Error en la cuenta. Contacte a soporte.'));
    }

    // Verificar si el usuario está eliminado (antes de verificar password para ahorrar CPU de argon2)
    if (authUser.seguridad?.estadoCuenta === 'eliminado') {
      return res.status(403).json(formatErrorResponse('Tu cuenta ha sido eliminada permanentemente.'));
    }

    // Verificar contraseña con argon2
    logger.info(`[LOGIN-AUDIT] 🔑 Verificando password con Argon2...`);
    const argonStart = Date.now();
    const isPasswordValid = await argon2.verify(authUser.password, password);
    logger.info(`[LOGIN-AUDIT] 🛡️ Argon2 completado en ${Date.now() - argonStart}ms`);

    if (!isPasswordValid) {
      return res.status(401).json(formatErrorResponse('Credenciales inválidas'));
    }

    // FASE 2: Password válido — ahora sí traer el usuario completo via Driver Directo (Evita cuelgues de Mongoose)
    // OPTIMIZACIÓN QUIRÚRGICA: Traer flags de estado pero excluir campos de texto masivo/binarios
    logger.info(`[LOGIN-AUDIT] 📦 Cargando perfil optimizado (Direct Driver)...`);
    const FULL_PROJECTION = { 
      password: 0, 
      "fundacion.documentacionFHSYL.testimonioConversion": 0,
      "fundacion.documentacionFHSYL.llamadoPastoral": 0,
      "fundacion.documentacionFHSYL.proyectoPsicosocial": 0,
      "fundacion.hojaDeVida.datos": 0, 
      "fundacion.entrevista.respuestas": 0,
      // Se conservan banderas de estado (completado, activo, onboarding, terminos)
      arena: 0,
      perfilPublicitario: 0,
      // Se mantienen solo los IDs de relaciones para evitar crash del front (includes)
      solicitudesAmistad: 0,
      grupos: 0
    };
    
    const fullUser = await User.collection.findOne({ _id: authUser._id }, { projection: FULL_PROJECTION });
    
    // AUTO-REPAIR: Asegurar que el Founder siempre tenga estado activo
    if (email?.trim()?.toLowerCase() === 'founderdegader@degadersocial.com') {
      if (fullUser?.seguridad?.rolSistema !== 'Founder' || fullUser?.seguridad?.estadoCuenta !== 'activo') {
         await User.collection.updateOne(
           { _id: fullUser._id },
           { $set: { 'seguridad.estadoCuenta': 'activo', 'seguridad.rolSistema': 'Founder' } }
         );
         logger.info('[LOGIN-AUDIT] ✅ Auto-repair Founder completado');
      }
    }

    // Generar token
    const token = generateToken(fullUser);

    // Preparar respuesta (Inyectar virtuals manuales ya que no usamos Mongoose hydrate)
    const userResponse = {
      ...fullUser,
      id: fullUser._id.toString(),
      rol: fullUser.seguridad?.rolSistema || 'usuario',
      nombreCompleto: `${fullUser.nombres?.primero || ''} ${fullUser.apellidos?.primero || ''}`.trim()
    };
    
    delete userResponse.password;
    delete userResponse.__v;

    logger.info(`[LOGIN-AUDIT] 🏁 Login exitoso para ${email}`);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    logger.error(`[LOGIN] Error: ${error.message}`);
    // Diferenciar timeout de red de otros errores
    if (error.name === 'MongoNetworkTimeoutError' || error.name === 'MongoServerSelectionError' || error.message?.includes('timed out')) {
      logger.error('[LOGIN] ⚠️ Timeout de base de datos detectado — la DB podría estar bajo presión');
      return res.status(503).json(formatErrorResponse('Servicio temporalmente no disponible. Intenta nuevamente en unos segundos.'));
    }
    res.status(500).json(formatErrorResponse('Error al iniciar sesión'));
  }
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // OPTIMIZACIÓN QUIRÚRGICA: Solo traer datos básicos + banderas de estado + arrays de relación (IDs)
    const user = await User.findById(req.userId)
      .select('nombres apellidos email username esMiembroFundacion fundacion.nivel fundacion.area fundacion.cargo fundacion.territorio fundacion.estadoAprobacion onboarding seguridad.rolSistema seguridad.versionTerminos seguridad.estadoCuenta personal.fechaNacimiento personal.genero personal.ubicacion social.fotoPerfil social.biografia amigos savedPosts favoritos usuariosFavoritos')
      .lean();

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

    if (!user || !user.password) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado o cuenta inválida'));
    }

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
 * Obtener información de suspensión
 * GET /api/auth/suspension-info
 */
const getSuspensionInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
    }

    // Calcular días restantes
    const calcularDias = (fechaFin) => {
      if (!fechaFin) return null;
      const ahora = new Date();
      const fin = new Date(fechaFin);
      const diff = fin - ahora;
      if (diff <= 0) return 0;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (user.seguridad?.estadoCuenta === 'suspendido' || user.seguridad?.estadoCuenta === 'inactivo') {
      return res.json({
        success: true,
        data: {
          suspended: true,
          estado: user.seguridad.estadoCuenta,
          fechaInicio: user.seguridad.fechaSuspension,
          fechaFin: user.seguridad.fechaFinSuspension,
          diasRestantes: calcularDias(user.seguridad.fechaFinSuspension),
          isPermanente: !user.seguridad.fechaFinSuspension,
          motivo: user.seguridad.motivoSuspension || 'No especificado'
        }
      });
    }

    res.json({
      success: true,
      data: { suspended: false }
    });
  } catch (error) {
    console.error('Error al obtener información de suspensión:', error);
    res.status(500).json(formatErrorResponse('Error al obtener información', [error.message]));
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
  getSuspensionInfo,
  logout
};