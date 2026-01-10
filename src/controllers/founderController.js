const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

/**
 * @desc    Registrar alerta de seguridad (acceso denegado)
 * @route   POST /api/founder/security-alert
 * @access  Private (Authenticated users)
 */
const logSecurityAlert = async (req, res) => {
    try {
        const { path, ip } = req.body;
        const user = req.user;

        // 1. Registrar en AuditLog
        await AuditLog.create({
            moderador: user._id, // Usuario que intentó acceder
            accion: 'acceso_denegado',
            objetivo: {
                tipo: 'usuario',
                id: user._id
            },
            detalles: {
                message: `Intento de acceso no autorizado a: ${path}`,
                ip: ip || req.ip
            },
            ipAddress: ip || req.ip,
            userAgent: req.headers['user-agent']
        });

        // 2. Enviar Notificación al Founder
        const founder = await User.findOne({ email: 'founderdegader@degader.org' });
        if (founder) {
            await Notification.create({
                receptor: founder._id,
                emisor: user._id,
                tipo: 'alerta_seguridad',
                contenido: `⚠️ ALERTA: El usuario ${user.username} intentó acceder al panel Founder sin permisos.`,
                referencia: {
                    tipo: 'UserV2',
                    id: user._id
                },
                metadata: {
                    path,
                    ip: ip || req.ip,
                    severity: 'high'
                }
            });
        }

        // 3. Enviar Notificación a otros Admins (opcional)
        // const admins = await User.find({ 
        //     'seguridad.rolSistema': { $in: ['admin', 'moderador'] },
        //     _id: { $ne: user._id } // No notificar al mismo usuario si fuera admin (aunque si fuera admin no vería esto)
        // });

        res.json({ success: true, message: 'Security alert logged' });

    } catch (error) {
        console.error('Error logging security alert:', error);
        // No devolver error detallado al cliente por seguridad
        res.status(200).json({ success: true });
    }
};
const argon2 = require('argon2');

/**
 * @desc    Obtener todos los usuarios con filtros
 * @route   GET /api/founder/users
 * @access  Private (Founder only)
 */
const getAllUsers = async (req, res) => {
    try {
        const {
            rol,
            estado,
            verificado,
            search,
            page = 1,
            limit = 20
        } = req.query;

        // Construir filtros
        const filter = {};

        if (rol) filter.rol = rol;
        if (estado) filter['seguridad.estadoCuenta'] = estado;
        if (verificado !== undefined) filter['seguridad.verificado'] = verificado === 'true';

        // Búsqueda por email o username
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { 'nombres.primero': { $regex: search, $options: 'i' } },
                { 'apellidos.primero': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const total = await User.countDocuments(filter);

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Calcular estadísticas
        const stats = {
            total: await User.countDocuments(),
            moderadores: await User.countDocuments({ rol: 'moderador' }),
            admins: await User.countDocuments({ rol: 'admin' }),
            suspendidos: await User.countDocuments({ 'seguridad.estadoCuenta': 'suspendido' })
        };

        res.json({
            success: true,
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            },
            stats
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
};

/**
 * @desc    Crear usuario con rol específico
 * @route   POST /api/founder/users
 * @access  Private (Founder only)
 */
const createUserWithRole = async (req, res) => {
    try {
        const {
            email,
            username,
            password,
            nombres,
            apellidos,
            rol,
            permisos
        } = req.body;

        // Validaciones
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, username y password son requeridos'
            });
        }

        // Verificar si el email ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Verificar si el username ya existe
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'El username ya está en uso'
            });
        }

        // Crear usuario con el rol especificado
        // NOTA: No hasheamos la contraseña aquí porque el modelo User tiene un pre-save hook que lo hace automáticamente
        const newUser = new User({
            email,
            username,
            password, // Pasar contraseña en texto plano para que el modelo la hashee
            nombres: nombres || { primero: 'Usuario', segundo: '' },
            apellidos: apellidos || { primero: 'Sistema', segundo: '' },
            rol: rol || 'usuario',
            seguridad: {
                rolSistema: rol === 'moderador' ? 'moderador' : 'Usuario',
                estadoCuenta: 'activo',
                verificado: true,
                permisos: permisos || {
                    crearEventos: false,
                    gestionarUsuarios: rol === 'moderador' || rol === 'admin',
                    gestionarFinanzas: false,
                    publicarNoticias: false,
                    accesoPanelAdmin: rol === 'moderador' || rol === 'admin',
                    moderarContenido: rol === 'moderador' || rol === 'admin'
                }
            }
        });

        await newUser.save();

        // Registrar en audit log
        await AuditLog.create({
            moderador: req.user._id,
            accion: 'crear_usuario',
            objetivo: {
                tipo: 'usuario',
                id: newUser._id
            },
            detalles: { message: `Usuario creado con rol: ${rol}` },
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: {
                _id: newUser._id,
                email: newUser.email,
                username: newUser.username,
                rol: newUser.rol,
                permisos: newUser.seguridad.permisos
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario'
        });
    }
};

/**
 * @desc    Actualizar rol de usuario
 * @route   PUT /api/founder/users/:id/role
 * @access  Private (Founder only)
 */
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol, permisos } = req.body;

        // No permitir modificar al Founder
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.email === 'founderdegader@degader.org') {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar al Founder'
            });
        }

        // Actualizar rol y permisos
        user.rol = rol;
        if (rol === 'moderador' || rol === 'admin') {
            user.seguridad.rolSistema = 'moderador';
        } else {
            user.seguridad.rolSistema = 'Usuario';
        }

        if (permisos) {
            user.seguridad.permisos = {
                ...user.seguridad.permisos,
                ...permisos
            };
        }

        await user.save();

        // Registrar en audit log
        await AuditLog.create({
            moderador: req.user._id,
            accion: 'cambiar_rol',
            objetivo: {
                tipo: 'Usuario',
                id: user._id
            },
            detalles: `Rol cambiado a: ${rol}`,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Rol actualizado exitosamente',
            user: {
                _id: user._id,
                email: user.email,
                rol: user.rol,
                permisos: user.seguridad.permisos
            }
        });
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar rol'
        });
    }
};

/**
 * @desc    Obtener usuario por ID
 * @route   GET /api/founder/users/:id
 * @access  Private (Founder only)
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario'
        });
    }
};

/**
 * @desc    Eliminar usuario (soft delete)
 * @route   DELETE /api/founder/users/:id
 * @access  Private (Founder only)
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir eliminar al Founder
        if (user.email === 'founderdegader@degader.org') {
            return res.status(403).json({
                success: false,
                message: 'No se puede eliminar al Founder'
            });
        }

        // Soft delete: cambiar estado a 'eliminado'
        user.seguridad.estadoCuenta = 'eliminado';
        await user.save();

        // Registrar en audit log
        await AuditLog.create({
            moderador: req.user._id,
            accion: 'eliminar_usuario',
            objetivo: {
                tipo: 'Usuario',
                id: user._id
            },
            detalles: `Usuario eliminado: ${user.email}`,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario'
        });
    }
};

module.exports = {
    getAllUsers,
    createUserWithRole,
    updateUserRole,
    getUserById,
    deleteUser,
    logSecurityAlert
};
