const UserV2 = require('../models/User.model');
const Iglesia = require('../models/Iglesia');
const Notification = require('../models/Notification');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener ministerios de un usuario específico
 * GET /api/ministerios/usuario/:userId
 */
const obtenerMinisteriosUsuario = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json(formatErrorResponse('ID de usuario inválido'));
        }

        const usuario = await UserV2.findById(userId)
            .select('eclesiastico nombres apellidos')
            .populate('eclesiastico.iglesia', 'nombre');

        if (!usuario) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        // El middleware esMiembroIglesia ya validó los permisos
        // No es necesario validar nuevamente aquí

        // ✅ Mapear ministerios para incluir _id explícitamente
        const ministeriosConId = (usuario.eclesiastico?.ministerios || []).map(m => ({
            _id: m._id,
            nombre: m.nombre,
            cargo: m.cargo,
            fechaInicio: m.fechaInicio,
            activo: m.activo
        }));

        res.json(formatSuccessResponse('Ministerios obtenidos exitosamente', {
            usuario: {
                _id: usuario._id,
                nombre: `${usuario.nombres.primero} ${usuario.apellidos.primero}`,
                rolPrincipal: usuario.eclesiastico?.rolPrincipal || 'miembro',
                iglesia: usuario.eclesiastico?.iglesia,
                ministerios: ministeriosConId
            }
        }));
    } catch (error) {
        console.error('Error al obtener ministerios del usuario:', error);
        res.status(500).json(formatErrorResponse('Error al obtener ministerios', [error.message]));
    }
};

/**
 * Asignar ministerio a un usuario
 * POST /api/ministerios/asignar
 * Body: { usuarioId, ministerio, cargo, iglesiaId }
 */
const asignarMinisterio = async (req, res) => {
    try {
        const { usuarioId, ministerio, cargo, iglesiaId } = req.body;

        console.log('🔵 [ASIGNAR MINISTERIO] Datos recibidos:', { usuarioId, ministerio, cargo, iglesiaId, adminId: req.userId });

        // Validaciones básicas
        if (!usuarioId || !ministerio || !cargo || !iglesiaId) {
            return res.status(400).json(formatErrorResponse('Faltan datos requeridos: usuarioId, ministerio, cargo, iglesiaId'));
        }

        if (!isValidObjectId(usuarioId) || !isValidObjectId(iglesiaId)) {
            return res.status(400).json(formatErrorResponse('IDs inválidos'));
        }

        // Validar que el ministerio sea válido
        const MINISTERIOS_VALIDOS = [
            "musica", "caballeros", "damas", "escuela_dominical", "evangelismo",
            "limpieza", "cocina", "medios", "juventud", "intercesion",
            "consejeria", "visitacion", "seguridad", "protocolo"
        ];

        if (!MINISTERIOS_VALIDOS.includes(ministerio)) {
            return res.status(400).json(formatErrorResponse('Ministerio no válido'));
        }

        // Validar que el cargo sea válido
        const CARGOS_VALIDOS = ["lider", "sublider", "miembro"];
        if (!CARGOS_VALIDOS.includes(cargo)) {
            return res.status(400).json(formatErrorResponse('Cargo no válido. Debe ser: lider, sublider o miembro'));
        }

        // Obtener iglesia y validar permisos
        const iglesia = await Iglesia.findById(iglesiaId);
        if (!iglesia) {
            return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));
        }

        // Verificar permisos del solicitante
        const solicitante = await UserV2.findById(req.userId).select('eclesiastico');
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = solicitante.eclesiastico?.rolPrincipal === 'adminIglesia' &&
            solicitante.eclesiastico?.iglesia?.toString() === iglesiaId;

        console.log('🔍 [ASIGNAR MINISTERIO] Verificación de permisos:', {
            esPastorPrincipal,
            esAdminIglesia,
            rolSolicitante: solicitante.eclesiastico?.rolPrincipal
        });

        if (!esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el pastor principal o administradores de la iglesia pueden asignar cargos'));
        }

        // Obtener usuario objetivo
        const usuario = await UserV2.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        // Validar que el usuario es miembro de la iglesia
        if (usuario.eclesiastico?.iglesia?.toString() !== iglesiaId) {
            return res.status(400).json(formatErrorResponse('El usuario no es miembro de esta iglesia'));
        }

        // Verificar si ya tiene este ministerio
        const ministerios = usuario.eclesiastico.ministerios || [];
        const ministerioExistente = ministerios.find(m => m.nombre === ministerio);

        if (ministerioExistente) {
            return res.status(400).json(formatErrorResponse(`El usuario ya pertenece al ministerio de ${ministerio}`));
        }

        // Agregar ministerio
        usuario.eclesiastico.ministerios.push({
            nombre: ministerio,
            cargo: cargo,
            fechaInicio: new Date(),
            activo: true
        });

        await usuario.save();

        console.log('✅ [ASIGNAR MINISTERIO] Ministerio asignado exitosamente');

        // ✅ Crear notificación para el usuario asignado
        const MINISTERIOS_LABELS = {
            "musica": "Música",
            "caballeros": "Caballeros",
            "damas": "Damas",
            "escuela_dominical": "Escuela Dominical",
            "evangelismo": "Evangelismo",
            "limpieza": "Limpieza",
            "cocina": "Cocina",
            "medios": "Medios",
            "juventud": "Juventud",
            "intercesion": "Intercesión",
            "consejeria": "Consejería",
            "visitacion": "Visitación",
            "seguridad": "Seguridad",
            "protocolo": "Protocolo"
        };

        const CARGOS_LABELS = {
            "lider": "Líder",
            "sublider": "Sublíder",
            "miembro": "Miembro"
        };

        const ministerioLabel = MINISTERIOS_LABELS[ministerio] || ministerio;
        const cargoLabel = CARGOS_LABELS[cargo] || cargo;

        try {
            const nuevaNotificacion = await Notification.create({
                receptor: usuarioId,
                emisor: req.userId,
                tipo: 'ministerio_asignado',
                contenido: `Has sido asignado al ministerio de ${ministerioLabel} como ${cargoLabel} en ${iglesia.nombre}`,
                referencia: {
                    tipo: 'Ministerio',
                    id: iglesiaId
                },
                metadata: {
                    ministerio: ministerioLabel,
                    cargo: cargoLabel,
                    iglesiaNombre: iglesia.nombre,
                    iglesiaId: iglesiaId
                }
            });

            console.log('✅ [ASIGNAR MINISTERIO] Notificación creada:', nuevaNotificacion._id);

            // Emitir socket para notificación en tiempo real
            const io = req.app.get('io');
            if (io) {
                const fullNotification = await Notification.findById(nuevaNotificacion._id)
                    .populate('emisor', 'nombres apellidos social.fotoPerfil')
                    .populate('receptor', 'nombres apellidos social.fotoPerfil');

                if (fullNotification) {
                    io.to(`notifications:${usuarioId}`).emit('newNotification', fullNotification);
                    console.log('🔔 [ASIGNAR MINISTERIO] Notificación enviada via socket a:', usuarioId);
                }
            }
        } catch (notifError) {
            console.error('⚠️ [ASIGNAR MINISTERIO] Error al crear notificación (no crítico):', notifError);
            // No fallar la operación principal si falla la notificación
        }

        res.json(formatSuccessResponse('Ministerio asignado exitosamente', {
            usuario: {
                _id: usuario._id,
                nombre: `${usuario.nombres.primero} ${usuario.apellidos.primero}`,
                ministerios: usuario.eclesiastico.ministerios
            }
        }));
    } catch (error) {
        console.error('❌ [ASIGNAR MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al asignar ministerio', [error.message]));
    }
};

/**
 * Actualizar cargo de un ministerio
 * PATCH /api/ministerios/:ministerioId
 * Body: { usuarioId, cargo }
 */
const actualizarMinisterio = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { usuarioId, cargo } = req.body;

        console.log('🔵 [ACTUALIZAR MINISTERIO] Datos:', { ministerioId, usuarioId, cargo, adminId: req.userId });

        if (!usuarioId || !cargo) {
            return res.status(400).json(formatErrorResponse('Faltan datos: usuarioId y cargo son requeridos'));
        }

        const CARGOS_VALIDOS = ["lider", "sublider", "miembro"];
        if (!CARGOS_VALIDOS.includes(cargo)) {
            return res.status(400).json(formatErrorResponse('Cargo no válido'));
        }

        // Obtener usuario
        const usuario = await UserV2.findById(usuarioId).populate('eclesiastico.iglesia');
        if (!usuario) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        const iglesiaId = usuario.eclesiastico?.iglesia?._id;
        if (!iglesiaId) {
            return res.status(400).json(formatErrorResponse('El usuario no pertenece a ninguna iglesia'));
        }

        // Verificar permisos
        const iglesia = await Iglesia.findById(iglesiaId);
        const solicitante = await UserV2.findById(req.userId).select('eclesiastico');

        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = solicitante.eclesiastico?.rolPrincipal === 'adminIglesia' &&
            solicitante.eclesiastico?.iglesia?.toString() === iglesiaId.toString();

        if (!esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el pastor principal o administradores pueden actualizar cargos'));
        }

        // Buscar y actualizar el ministerio
        const ministerio = usuario.eclesiastico.ministerios.id(ministerioId);
        if (!ministerio) {
            return res.status(404).json(formatErrorResponse('Ministerio no encontrado'));
        }

        const ministerioAnterior = ministerio.cargo; // Guardar cargo anterior
        ministerio.cargo = cargo;
        await usuario.save();

        console.log('✅ [ACTUALIZAR MINISTERIO] Cargo actualizado');

        // ✅ Crear notificación de actualización de cargo
        const MINISTERIOS_LABELS = {
            "musica": "Música", "caballeros": "Caballeros", "damas": "Damas",
            "escuela_dominical": "Escuela Dominical", "evangelismo": "Evangelismo",
            "limpieza": "Limpieza", "cocina": "Cocina", "medios": "Medios",
            "juventud": "Juventud", "intercesion": "Intercesión",
            "consejeria": "Consejería", "visitacion": "Visitación",
            "seguridad": "Seguridad", "protocolo": "Protocolo"
        };
        const CARGOS_LABELS = { "lider": "Líder", "sublider": "Sublíder", "miembro": "Miembro" };

        const ministerioLabel = MINISTERIOS_LABELS[ministerio.nombre] || ministerio.nombre;
        const cargoLabel = CARGOS_LABELS[cargo] || cargo;

        try {
            const nuevaNotificacion = await Notification.create({
                receptor: usuarioId,
                emisor: req.userId,
                tipo: 'ministerio_actualizado',
                contenido: `Tu cargo en el ministerio de ${ministerioLabel} ha sido actualizado a ${cargoLabel}`,
                referencia: { tipo: 'Ministerio', id: iglesiaId },
                metadata: {
                    ministerio: ministerioLabel,
                    cargoAnterior: CARGOS_LABELS[ministerioAnterior] || ministerioAnterior,
                    cargoNuevo: cargoLabel,
                    iglesiaNombre: usuario.eclesiastico.iglesia.nombre || 'tu iglesia',
                    iglesiaId: iglesiaId
                }
            });

            const io = req.app.get('io');
            if (io) {
                const fullNotification = await Notification.findById(nuevaNotificacion._id)
                    .populate('emisor', 'nombres apellidos social.fotoPerfil')
                    .populate('receptor', 'nombres apellidos social.fotoPerfil');
                if (fullNotification) {
                    io.to(`notifications:${usuarioId}`).emit('newNotification', fullNotification);
                    console.log('🔔 [ACTUALIZAR MINISTERIO] Notificación enviada');
                }
            }
        } catch (notifError) {
            console.error('⚠️ Error al crear notificación (no crítico):', notifError);
        }

        res.json(formatSuccessResponse('Cargo actualizado exitosamente', {
            usuario: {
                _id: usuario._id,
                nombre: `${usuario.nombres.primero} ${usuario.apellidos.primero}`,
                ministerios: usuario.eclesiastico.ministerios
            }
        }));
    } catch (error) {
        console.error('❌ [ACTUALIZAR MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al actualizar ministerio', [error.message]));
    }
};

/**
 * Remover ministerio de un usuario
 * DELETE /api/ministerios/:ministerioId
 * Query: usuarioId
 */
const removerMinisterio = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { usuarioId } = req.query;

        console.log('🔵 [REMOVER MINISTERIO] Datos:', { ministerioId, usuarioId, adminId: req.userId });

        if (!usuarioId) {
            return res.status(400).json(formatErrorResponse('usuarioId es requerido'));
        }

        // Obtener usuario
        const usuario = await UserV2.findById(usuarioId).populate('eclesiastico.iglesia');
        if (!usuario) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        const iglesiaId = usuario.eclesiastico?.iglesia?._id;
        if (!iglesiaId) {
            return res.status(400).json(formatErrorResponse('El usuario no pertenece a ninguna iglesia'));
        }

        // Verificar permisos
        const iglesia = await Iglesia.findById(iglesiaId);
        const solicitante = await UserV2.findById(req.userId).select('eclesiastico');

        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = solicitante.eclesiastico?.rolPrincipal === 'adminIglesia' &&
            solicitante.eclesiastico?.iglesia?.toString() === iglesiaId.toString();

        if (!esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el pastor principal o administradores pueden remover ministerios'));
        }

        // Remover ministerio
        const ministerio = usuario.eclesiastico.ministerios.id(ministerioId);
        if (!ministerio) {
            return res.status(404).json(formatErrorResponse('Ministerio no encontrado'));
        }

        const ministerioNombre = ministerio.nombre; // Guardar antes de eliminar
        const ministerioCargo = ministerio.cargo;
        ministerio.deleteOne();
        await usuario.save();

        console.log('✅ [REMOVER MINISTERIO] Ministerio removido');

        // ✅ Crear notificación de remoción
        const MINISTERIOS_LABELS = {
            "musica": "Música", "caballeros": "Caballeros", "damas": "Damas",
            "escuela_dominical": "Escuela Dominical", "evangelismo": "Evangelismo",
            "limpieza": "Limpieza", "cocina": "Cocina", "medios": "Medios",
            "juventud": "Juventud", "intercesion": "Intercesión",
            "consejeria": "Consejería", "visitacion": "Visitación",
            "seguridad": "Seguridad", "protocolo": "Protocolo"
        };

        const ministerioLabel = MINISTERIOS_LABELS[ministerioNombre] || ministerioNombre;

        try {
            const nuevaNotificacion = await Notification.create({
                receptor: usuarioId,
                emisor: req.userId,
                tipo: 'ministerio_removido',
                contenido: `Has sido removido del ministerio de ${ministerioLabel}`,
                referencia: { tipo: 'Ministerio', id: iglesiaId },
                metadata: {
                    ministerio: ministerioLabel,
                    cargoAnterior: ministerioCargo,
                    iglesiaNombre: usuario.eclesiastico.iglesia.nombre || 'tu iglesia',
                    iglesiaId: iglesiaId
                }
            });

            const io = req.app.get('io');
            if (io) {
                const fullNotification = await Notification.findById(nuevaNotificacion._id)
                    .populate('emisor', 'nombres apellidos social.fotoPerfil')
                    .populate('receptor', 'nombres apellidos social.fotoPerfil');
                if (fullNotification) {
                    io.to(`notifications:${usuarioId}`).emit('newNotification', fullNotification);
                    console.log('🔔 [REMOVER MINISTERIO] Notificación enviada');
                }
            }
        } catch (notifError) {
            console.error('⚠️ Error al crear notificación (no crítico):', notifError);
        }

        res.json(formatSuccessResponse('Ministerio removido exitosamente', {
            usuario: {
                _id: usuario._id,
                nombre: `${usuario.nombres.primero} ${usuario.apellidos.primero}`,
                ministerios: usuario.eclesiastico.ministerios
            }
        }));
    } catch (error) {
        console.error('❌ [REMOVER MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al remover ministerio', [error.message]));
    }
};

/**
 * Agregar/remover miembro a ministerio (para líderes)
 * POST /api/ministerios/:ministerioNombre/miembros
 * Body: { usuarioId, accion: 'agregar' | 'remover' }
 */
const gestionarMiembroMinisterio = async (req, res) => {
    try {
        const { ministerioNombre } = req.params;
        const { usuarioId, accion } = req.body;

        console.log('🔵 [GESTIONAR MIEMBRO] Datos:', { ministerioNombre, usuarioId, accion, liderId: req.userId });

        if (!usuarioId || !accion) {
            return res.status(400).json(formatErrorResponse('usuarioId y accion son requeridos'));
        }

        if (!['agregar', 'remover'].includes(accion)) {
            return res.status(400).json(formatErrorResponse('Acción debe ser "agregar" o "remover"'));
        }

        // Obtener líder solicitante
        const lider = await UserV2.findById(req.userId).select('eclesiastico').populate('eclesiastico.iglesia');
        if (!lider || !lider.eclesiastico?.iglesia) {
            return res.status(400).json(formatErrorResponse('No perteneces a ninguna iglesia'));
        }

        // Verificar que el solicitante es líder del ministerio
        const ministerioLider = lider.eclesiastico.ministerios.find(m => m.nombre === ministerioNombre && m.cargo === 'lider');

        // O es pastor/admin
        const iglesia = await Iglesia.findById(lider.eclesiastico.iglesia._id);
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = lider.eclesiastico.rolPrincipal === 'adminIglesia';

        if (!ministerioLider && !esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el líder del ministerio, pastor o administradores pueden gestionar miembros'));
        }

        // Obtener usuario objetivo
        const usuario = await UserV2.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        // Validar que pertenece a la misma iglesia
        if (usuario.eclesiastico?.iglesia?.toString() !== lider.eclesiastico.iglesia._id.toString()) {
            return res.status(400).json(formatErrorResponse('El usuario no pertenece a la misma iglesia'));
        }

        if (accion === 'agregar') {
            // Verificar si ya está en el ministerio
            const yaEnMinisterio = usuario.eclesiastico.ministerios.find(m => m.nombre === ministerioNombre);
            if (yaEnMinisterio) {
                return res.status(400).json(formatErrorResponse('El usuario ya pertenece a este ministerio'));
            }

            // Agregar como miembro
            usuario.eclesiastico.ministerios.push({
                nombre: ministerioNombre,
                cargo: 'miembro',
                fechaInicio: new Date(),
                activo: true
            });
        } else {
            // Remover (solo si es miembro, no líder)
            const ministerio = usuario.eclesiastico.ministerios.find(m => m.nombre === ministerioNombre);
            if (!ministerio) {
                return res.status(404).json(formatErrorResponse('Usuario no pertenece a este ministerio'));
            }

            if (ministerio.cargo === 'lider' || ministerio.cargo === 'sublider') {
                return res.status(403).json(formatErrorResponse('No puedes remover líderes o sublíderes. Solo el pastor puede hacerlo'));
            }

            ministerio.deleteOne();
        }

        await usuario.save();

        console.log(`✅ [GESTIONAR MIEMBRO] Miembro ${accion === 'agregar' ? 'agregado' : 'removido'}`);

        res.json(formatSuccessResponse(`Miembro ${accion === 'agregar' ? 'agregado' : 'removido'} exitosamente`, {
            usuario: {
                _id: usuario._id,
                nombre: `${usuario.nombres.primero} ${usuario.apellidos.primero}`,
                ministerios: usuario.eclesiastico.ministerios
            }
        }));
    } catch (error) {
        console.error('❌ [GESTIONAR MIEMBRO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al gestionar miembro', [error.message]));
    }
};

/**
 * Obtener todos los miembros de un ministerio
 * GET /api/ministerios/:ministerioNombre/miembros
 * Query: iglesiaId
 */
const obtenerMiembrosPorMinisterio = async (req, res) => {
    try {
        const { ministerioNombre } = req.params;
        const { iglesiaId } = req.query;

        console.log('🔍 [OBTENER MIEMBROS MINISTERIO] Datos:', { ministerioNombre, iglesiaId });

        if (!iglesiaId || !isValidObjectId(iglesiaId)) {
            return res.status(400).json(formatErrorResponse('iglesiaId válido es requerido'));
        }

        // Verificar que el solicitante es miembro de la iglesia
        const solicitante = await UserV2.findById(req.userId).select('eclesiastico');
        if (solicitante.eclesiastico?.iglesia?.toString() !== iglesiaId) {
            return res.status(403).json(formatErrorResponse('No tienes acceso a esta información'));
        }

        // Buscar todos los usuarios con este ministerio en esta iglesia
        const miembros = await UserV2.find({
            'eclesiastico.iglesia': iglesiaId,
            'eclesiastico.ministerios.nombre': ministerioNombre,
            'eclesiastico.ministerios.activo': true
        })
            .select('nombres apellidos social.fotoPerfil eclesiastico.ministerios')
            .lean();

        // Filtrar solo el ministerio específico de cada usuario
        const miembrosFormateados = miembros.map(miembro => {
            const ministerio = miembro.eclesiastico.ministerios.find(m => m.nombre === ministerioNombre);
            return {
                _id: miembro._id,
                nombre: `${miembro.nombres.primero} ${miembro.apellidos.primero}`,
                fotoPerfil: miembro.social?.fotoPerfil,
                cargo: ministerio.cargo,
                fechaInicio: ministerio.fechaInicio
            };
        });

        console.log(`✅ [OBTENER MIEMBROS MINISTERIO] ${miembrosFormateados.length} miembros encontrados`);

        res.json(formatSuccessResponse('Miembros obtenidos exitosamente', {
            ministerio: ministerioNombre,
            totalMiembros: miembrosFormateados.length,
            miembros: miembrosFormateados
        }));
    } catch (error) {
        console.error('❌ [OBTENER MIEMBROS MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al obtener miembros', [error.message]));
    }
};

/**
 * Enviar notificación a todos los miembros de un ministerio
 * POST /api/ministerios/:ministerioNombre/notificaciones
 * Body: { iglesiaId, contenido, metadata }
 */
const enviarNotificacionMinisterio = async (req, res) => {
    try {
        const { ministerioNombre } = req.params;
        const { iglesiaId, contenido, metadata } = req.body;

        console.log('📢 [NOTIFICACIÓN MINISTERIO] Datos:', { ministerioNombre, iglesiaId, emisorId: req.userId });

        if (!iglesiaId || !contenido) {
            return res.status(400).json(formatErrorResponse('iglesiaId y contenido son requeridos'));
        }

        if (!isValidObjectId(iglesiaId)) {
            return res.status(400).json(formatErrorResponse('iglesiaId inválido'));
        }

        // Obtener líder/pastor que envía
        const emisor = await UserV2.findById(req.userId).select('eclesiastico nombres apellidos');
        if (!emisor || !emisor.eclesiastico?.iglesia) {
            return res.status(400).json(formatErrorResponse('No perteneces a ninguna iglesia'));
        }

        // Verificar que es de la misma iglesia
        if (emisor.eclesiastico.iglesia.toString() !== iglesiaId) {
            return res.status(403).json(formatErrorResponse('Solo puedes enviar notificaciones a tu iglesia'));
        }

        // Verificar permisos: líder del ministerio, pastor o admin
        const ministerioLider = emisor.eclesiastico.ministerios?.find(m => m.nombre === ministerioNombre && m.cargo === 'lider');
        const iglesia = await Iglesia.findById(iglesiaId);
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = emisor.eclesiastico.rolPrincipal === 'adminIglesia';

        if (!ministerioLider && !esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el líder del ministerio, pastor o administradores pueden enviar notificaciones'));
        }

        // Obtener todos los miembros del ministerio
        const miembros = await UserV2.find({
            'eclesiastico.iglesia': iglesiaId,
            'eclesiastico.ministerios.nombre': ministerioNombre,
            'eclesiastico.ministerios.activo': true
        }).select('_id');

        if (miembros.length === 0) {
            return res.status(404).json(formatErrorResponse('No hay miembros en este ministerio'));
        }

        // Crear notificaciones para cada miembro
        const notificaciones = [];
        for (const miembro of miembros) {
            // No enviar notificación al propio emisor
            if (miembro._id.toString() === req.userId.toString()) continue;

            const notificacion = await Notification.create({
                receptor: miembro._id,
                emisor: req.userId,
                tipo: 'ministerio_notificacion',
                contenido,
                referencia: {
                    tipo: 'Ministerio',
                    id: iglesiaId
                },
                metadata: {
                    ministerio: ministerioNombre,
                    iglesiaNombre: iglesia.nombre,
                    ...metadata
                }
            });

            notificaciones.push(notificacion);
        }

        // Emitir eventos socket para tiempo real
        const io = req.app.get('io');
        if (io) {
            for (const notificacion of notificaciones) {
                const fullNotification = await Notification.findById(notificacion._id)
                    .populate('emisor', 'nombres apellidos social.fotoPerfil')
                    .populate('receptor', 'nombres apellidos social.fotoPerfil');

                if (fullNotification) {
                    io.to(`notifications:${notificacion.receptor}`).emit('newNotification', fullNotification);
                }
            }
        }

        console.log(`✅ [NOTIFICACIÓN MINISTERIO] ${notificaciones.length} notificaciones enviadas`);

        res.json(formatSuccessResponse('Notificación enviada exitosamente', {
            ministerio: ministerioNombre,
            totalNotificaciones: notificaciones.length,
            destinatarios: miembros.length
        }));
    } catch (error) {
        console.error('❌ [NOTIFICACIÓN MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al enviar notificación', [error.message]));
    }
};

/**
 * Enviar anuncio a todos los miembros de un ministerio
 * POST /api/ministerios/:ministerioNombre/anuncios
 * Body: { iglesiaId, titulo, mensaje, tipo }
 */
const enviarAnuncioMinisterio = async (req, res) => {
    try {
        const { ministerioNombre } = req.params;
        const { iglesiaId, titulo, mensaje, tipo } = req.body;

        console.log('📣 [ANUNCIO MINISTERIO] Datos:', { ministerioNombre, iglesiaId, titulo, emisorId: req.userId });

        if (!iglesiaId || !titulo || !mensaje) {
            return res.status(400).json(formatErrorResponse('iglesiaId, titulo y mensaje son requeridos'));
        }

        if (!isValidObjectId(iglesiaId)) {
            return res.status(400).json(formatErrorResponse('iglesiaId inválido'));
        }

        // Obtener líder/pastor que envía
        const emisor = await UserV2.findById(req.userId).select('eclesiastico nombres apellidos');
        if (!emisor || !emisor.eclesiastico?.iglesia) {
            return res.status(400).json(formatErrorResponse('No perteneces a ninguna iglesia'));
        }

        // Verificar que es de la misma iglesia
        if (emisor.eclesiastico.iglesia.toString() !== iglesiaId) {
            return res.status(403).json(formatErrorResponse('Solo puedes enviar anuncios a tu iglesia'));
        }

        // Verificar permisos: líder del ministerio, pastor o admin
        const ministerioLider = emisor.eclesiastico.ministerios?.find(m => m.nombre === ministerioNombre && m.cargo === 'lider');
        const iglesia = await Iglesia.findById(iglesiaId);
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === req.userId.toString();
        const esAdminIglesia = emisor.eclesiastico.rolPrincipal === 'adminIglesia';

        if (!ministerioLider && !esPastorPrincipal && !esAdminIglesia) {
            return res.status(403).json(formatErrorResponse('Solo el líder del ministerio, pastor o administradores pueden enviar anuncios'));
        }

        // Obtener todos los miembros del ministerio
        const miembros = await UserV2.find({
            'eclesiastico.iglesia': iglesiaId,
            'eclesiastico.ministerios.nombre': ministerioNombre,
            'eclesiastico.ministerios.activo': true
        }).select('_id nombres apellidos');

        if (miembros.length === 0) {
            return res.status(404).json(formatErrorResponse('No hay miembros en este ministerio'));
        }

        // Crear notificación tipo anuncio para cada miembro
        const anuncios = [];
        for (const miembro of miembros) {
            // No enviar anuncio al propio emisor
            if (miembro._id.toString() === req.userId.toString()) continue;

            const anuncio = await Notification.create({
                receptor: miembro._id,
                emisor: req.userId,
                tipo: 'ministerio_anuncio',
                contenido: `${titulo}: ${mensaje}`,
                referencia: {
                    tipo: 'Ministerio',
                    id: iglesiaId
                },
                metadata: {
                    ministerio: ministerioNombre,
                    iglesiaNombre: iglesia.nombre,
                    titulo,
                    mensaje,
                    tipoAnuncio: tipo || 'general'
                }
            });

            anuncios.push(anuncio);
        }

        // Emitir eventos socket para tiempo real
        const io = req.app.get('io');
        if (io) {
            for (const anuncio of anuncios) {
                const fullNotification = await Notification.findById(anuncio._id)
                    .populate('emisor', 'nombres apellidos social.fotoPerfil')
                    .populate('receptor', 'nombres apellidos social.fotoPerfil');

                if (fullNotification) {
                    io.to(`notifications:${anuncio.receptor}`).emit('newNotification', fullNotification);
                    // También emitir evento específico para anuncios de ministerio
                    io.to(`user:${anuncio.receptor}`).emit('ministerioAnuncio', {
                        ministerio: ministerioNombre,
                        titulo,
                        mensaje,
                        emisor: `${emisor.nombres.primero} ${emisor.apellidos.primero}`
                    });
                }
            }
        }

        console.log(`✅ [ANUNCIO MINISTERIO] ${anuncios.length} anuncios enviados`);

        res.json(formatSuccessResponse('Anuncio enviado exitosamente', {
            ministerio: ministerioNombre,
            totalAnuncios: anuncios.length,
            destinatarios: miembros.length,
            titulo,
            mensaje
        }));
    } catch (error) {
        console.error('❌ [ANUNCIO MINISTERIO] Error:', error);
        res.status(500).json(formatErrorResponse('Error al enviar anuncio', [error.message]));
    }
};

module.exports = {
    obtenerMinisteriosUsuario,
    asignarMinisterio,
    actualizarMinisterio,
    removerMinisterio,
    gestionarMiembroMinisterio,
    obtenerMiembrosPorMinisterio,
    enviarNotificacionMinisterio,
    enviarAnuncioMinisterio
};
