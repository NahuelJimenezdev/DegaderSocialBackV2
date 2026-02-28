const arenaService = require('../services/arena.service');
const rankingService = require('../services/ranking.service');
const achievementsService = require('../services/achievements.service');
const arenaRepository = require('../repositories/arena.repository');
const { formatSuccessResponse } = require('../../../utils/validators');

class ArenaController {
    /**
     * Obtiene desafíos aleatorios
     */
    async getChallenges(req, res) {
        try {
            const { level } = req.query;
            const userId = req.user.id;

            // Buscar al usuario para obtener sus desafíos completados
            const user = await arenaRepository.findUserById(userId);
            const excludeIds = user?.arena?.completedChallenges || [];

            const challenges = await arenaRepository.getRandomChallenges(level || 'facil', 5, excludeIds);
            res.json(formatSuccessResponse('Desafíos obtenidos', challenges));
        } catch (error) {
            res.status(500).json({ message: 'Error obteniendo desafíos', error: error.message });
        }
    }

    /**
     * Envía el resultado (Fase 2: Asíncrono vía eventos)
     */
    async submitResult(req, res) {
        try {
            const userId = req.user.id;
            // const clientIp = req.ip || req.headers['x-forwarded-for']; // No longer needed as req.ip is passed directly

            const result = await arenaService.processSessionResult(userId, req.body, req.ip);

            res.status(200).json({
                success: true,
                message: 'Desafío completado con éxito',
                data: result
            });
        } catch (error) {
            res.status(500).json({ message: 'Error procesando resultado', error: error.message });
        }
    }

    /**
     * Obtiene el ranking
     */
    async getRanking(req, res) {
        try {
            const { type, country, state } = req.query;
            const limit = parseInt(req.query.limit) || 100;
            const ranking = await rankingService.getTopRanking(type, country, state, limit);
            res.json(formatSuccessResponse('Ranking obtenido', ranking));
        } catch (error) {
            res.status(500).json({ message: 'Error obteniendo ranking', error: error.message });
        }
    }

    /**
     * Obtiene el estado del usuario (Sincronizado con Perfil Social)
     */
    async getMyStatus(req, res) {
        try {
            const userId = req.user.id;
            const user = await arenaRepository.findUserById(userId);
            const globalRank = await rankingService.getUserRank(userId);

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Proactive Achievement Check (Unlock missing achievements for veteran players)
            const newlyUnlocked = await achievementsService.checkAndUnlock(user, {});
            if (newlyUnlocked.length > 0) {
                await user.save();
            }

            const responseData = {
                name: `${user.nombres?.primero || 'Guerrero'} ${user.apellidos?.primero || ''}`.trim(),
                avatar: user.social?.fotoPerfil || '',
                username: user.username,
                location: {
                    country: user.personal?.ubicacion?.pais || '',
                    state: user.personal?.ubicacion?.estado || ''
                },
                arena: {
                    ...user.arena,
                    wins: user.arena?.wins || 0,
                    gamesPlayed: user.arena?.gamesPlayed || 0,
                    xp: user.arena?.xp || 0,
                    level: user.arena?.level || 'facil'
                },
                economy: user.economy || { coins: 0, gems: 0 },
                ranking: globalRank
            };

            res.json(formatSuccessResponse('Estatus obtenido exitosamente', responseData));
        } catch (error) {
            console.error('Error en getMyStatus:', error);
            res.status(500).json({ message: 'Error obteniendo estatus', error: error.message });
        }
    }
}

module.exports = new ArenaController();
