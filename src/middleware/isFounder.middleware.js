/**
 * Middleware para verificar que el usuario sea Founder
 * Solo permite acceso a founderdegader@degader.org o usuarios con rolSistema 'Founder'
 */
const isFounder = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // Verificar si es el Founder por email o por rol del sistema
        const isFounderEmail = req.user.email === 'founderdegader@degader.org';
        const isFounderRole = req.user.seguridad?.rolSistema === 'Founder';

        if (!isFounderEmail && !isFounderRole) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Solo el Founder tiene acceso a esta funcionalidad.'
            });
        }

        next();
    } catch (error) {
        console.error('Error en isFounder middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar permisos de Founder'
        });
    }
};

module.exports = { isFounder };
