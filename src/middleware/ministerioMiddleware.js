const UserV2 = require('../models/User.model');
const Iglesia = require('../models/Iglesia');
const { formatErrorResponse } = require('../utils/validators');

/**
 * Middleware para verificar que el usuario es administrador de la iglesia
 * (Pastor principal o adminIglesia)
 */
const esAdminIglesia = async (req, res, next) => {
    try {
        const userId = req.userId;

        // Obtener datos del usuario
        const usuario = await UserV2.findById(userId).select('eclesiastico').populate('eclesiastico.iglesia');

        if (!usuario || !usuario.eclesiastico?.iglesia) {
            return res.status(403).json(formatErrorResponse('No perteneces a ninguna iglesia'));
        }

        const iglesiaId = usuario.eclesiastico.iglesia._id;
        const iglesia = await Iglesia.findById(iglesiaId);

        if (!iglesia) {
            return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));
        }

        // Verificar si es pastor principal
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === userId.toString();

        // Verificar si es adminIglesia
        const esAdmin = usuario.eclesiastico.rolPrincipal === 'adminIglesia';

        if (!esPastorPrincipal && !esAdmin) {
            return res.status(403).json(formatErrorResponse('Solo el pastor principal o administradores de la iglesia pueden realizar esta acción'));
        }

        // Guardar información en req para uso posterior
        req.iglesiaId = iglesiaId;
        req.esPastorPrincipal = esPastorPrincipal;
        req.esAdminIglesia = esAdmin;

        next();
    } catch (error) {
        console.error('Error en middleware esAdminIglesia:', error);
        return res.status(500).json(formatErrorResponse('Error al verificar permisos', [error.message]));
    }
};

/**
 * Middleware para verificar que el usuario es miembro de la iglesia
 * Permite acceso si el usuario pertenece a la misma iglesia que el usuario objetivo
 */
const esMiembroIglesia = async (req, res, next) => {
    try {
        const solicitanteId = req.userId; // Usuario autenticado
        const { userId: targetUserId } = req.params; // Usuario objetivo del que se quiere ver info

        // Obtener datos del usuario autenticado
        const solicitante = await UserV2.findById(solicitanteId).select('eclesiastico seguridad');

        // Si no pertenece a iglesia, verificar si es admin del sistema
        if (!solicitante.eclesiastico?.iglesia) {
            const esAdminSistema = solicitante.seguridad?.rolSistema === 'admin' || solicitante.seguridad?.rolSistema === 'Founder';
            if (!esAdminSistema) {
                return res.status(403).json(formatErrorResponse('No perteneces a ninguna iglesia'));
            }
            // Admin del sistema puede proceder
            return next();
        }

        // Si hay un usuario objetivo (targetUserId), verificar que pertenezcan a la misma iglesia
        if (targetUserId) {
            const targetUser = await UserV2.findById(targetUserId).select('eclesiastico');

            if (!targetUser) {
                return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
            }

            // Verificar que ambos pertenezcan a la misma iglesia
            const mismaIglesia = solicitante.eclesiastico.iglesia.toString() === targetUser.eclesiastico?.iglesia?.toString();

            if (!mismaIglesia) {
                return res.status(403).json(formatErrorResponse('No tienes permisos para ver esta información'));
            }
        }

        req.iglesiaUsuario = solicitante.eclesiastico.iglesia;

        next();
    } catch (error) {
        console.error('Error en middleware esMiembroIglesia:', error);
        return res.status(500).json(formatErrorResponse('Error al verificar membresía', [error.message]));
    }
};

/**
 * Middleware para verificar que el usuario es líder de un ministerio específico
 * o administrador de la iglesia
 */
const esLiderOAdmin = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { ministerioNombre } = req.params;

        // Obtener datos del usuario
        const usuario = await UserV2.findById(userId).select('eclesiastico').populate('eclesiastico.iglesia');

        if (!usuario || !usuario.eclesiastico?.iglesia) {
            return res.status(403).json(formatErrorResponse('No perteneces a ninguna iglesia'));
        }

        const iglesiaId = usuario.eclesiastico.iglesia._id;
        const iglesia = await Iglesia.findById(iglesiaId);

        // Verificar si es pastor principal
        const esPastorPrincipal = iglesia.pastorPrincipal.toString() === userId.toString();

        // Verificar si es adminIglesia
        const esAdmin = usuario.eclesiastico.rolPrincipal === 'adminIglesia';

        // Verificar si es líder del ministerio específico
        const esLider = usuario.eclesiastico.ministerios?.some(
            m => m.nombre === ministerioNombre && m.cargo === 'lider' && m.activo
        );

        if (!esPastorPrincipal && !esAdmin && !esLider) {
            return res.status(403).json(formatErrorResponse('Solo el pastor, administradores o líderes del ministerio pueden realizar esta acción'));
        }

        req.iglesiaId = iglesiaId;
        req.esPastorPrincipal = esPastorPrincipal;
        req.esAdminIglesia = esAdmin;
        req.esLiderMinisterio = esLider;

        next();
    } catch (error) {
        console.error('Error en middleware esLiderOAdmin:', error);
        return res.status(500).json(formatErrorResponse('Error al verificar permisos', [error.message]));
    }
};

module.exports = {
    esAdminIglesia,
    esMiembroIglesia,
    esLiderOAdmin
};
