/**
 * Middleware para verificar que el usuario tenga permisos de moderador
 */
const checkModerator = async (req, res, next) => {
    try {
        // El middleware `authenticate` debe ejecutarse antes
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // Verificar rol (soporta múltiples formatos)
        const userRole = req.user.rol || 'usuario';
        const systemRole = req.user.seguridad?.rolSistema;

        // Permitir acceso si:
        // 1. Tiene rol 'moderador' o 'admin' en el campo directo
        // 2. O tiene rolSistema 'Founder' (usuario fundador tiene todos los permisos)
        // 3. O es el Founder identificado por email (Backdoor de seguridad)
        const isFounderEmail = req.user.email === 'founderdegader@degader.org';

        const hasPermissions =
            userRole === 'moderador' ||
            userRole === 'admin' ||
            systemRole === 'Founder' ||
            systemRole === 'moderador' ||
            isFounderEmail;

        if (!hasPermissions) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: Se requieren permisos de moderador'
            });
        }

        // Usuario tiene permisos, continuar
        next();
    } catch (error) {
        console.error('Error en checkModerator:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar permisos'
        });
    }
};

module.exports = { checkModerator };
