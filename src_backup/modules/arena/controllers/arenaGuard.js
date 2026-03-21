const User = require('../../../models/User.model');
const Season = require('../../../models/season.model');
const metrics = require('../../../infrastructure/metrics/metrics.service');

/**
 * ArenaGuard - Middleware de Anti-Cheat y Seguridad
 */
const arenaGuard = async (req, res, next) => {
    const userId = req.user.id; // Asumiendo que viene del auth middleware
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    try {
        const user = await User.findById(userId).select('arena economy');
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // 1. Verificar si está bloqueado por el sistema anti-cheat
        if (user.arena.antiCheatFlags.lockedUntil && user.arena.antiCheatFlags.lockedUntil > new Date()) {
            metrics.incSuspicious('locked_user_attempt');
            return res.status(403).json({
                message: 'Acceso a la Arena bloqueado temporalmente por actividad sospechosa.',
                lockedUntil: user.arena.antiCheatFlags.lockedUntil
            });
        }

        // 2. Registro de IP
        user.arena.antiCheatFlags.lastIp = clientIp;

        // 3. Verificar Temporada Activa
        const activeSeason = await Season.findOne({ isActive: true });
        if (!activeSeason) {
            // Opcional: Registrar que no hay temporada activa para métricas
        }

        // 4. Validación de payload (Cálculos matemáticos)
        if (req.method === 'POST' && req.path === '/submit') {
            const { duration, totalQuestions, score, xpEarned } = req.body;

            // Regla: Una partida no puede durar menos de 2 segundos por pregunta
            const minLogicDuration = totalQuestions * 2;
            if (duration < minLogicDuration) {
                user.arena.antiCheatFlags.suspiciousAttempts += 1;
                metrics.incSuspicious('too_fast');
                await user.save();
                return res.status(400).json({ message: 'Duración de partida inconsistente.' });
            }

            // Regla: XP máxima posible calculando multiplicadores (SaaS + Boost)
            const maxPossibleXPPerQuestion = 500;
            const multiplier = (user.economy.xpBoostActiveUntil > new Date() ? 2 : 1);
            const maxPossibleXP = totalQuestions * maxPossibleXPPerQuestion * multiplier;

            if (xpEarned > maxPossibleXP) {
                user.arena.antiCheatFlags.suspiciousAttempts += 1;
                metrics.incSuspicious('xp_overflow');
                await user.save();
                return res.status(400).json({ message: 'Ganancia de XP fuera de los límites permitidos.' });
            }
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Error en validación de seguridad de Arena' });
    }
};

module.exports = arenaGuard;
