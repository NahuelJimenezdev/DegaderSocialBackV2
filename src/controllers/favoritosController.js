const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');

/**
 * Toggle usuario favorito
 * POST /api/favoritos/usuario/:userId
 */
const toggleFavoriteUser = async (req, res) => {
    try {
        const currentUserId = req.userId; // Usuario autenticado
        const { userId } = req.params; // Usuario a agregar/quitar de favoritos

        // Validar que no se agregue a sí mismo
        if (currentUserId === userId) {
            return res.status(400).json(formatErrorResponse('No puedes agregarte a ti mismo como favorito'));
        }

        // Verificar que el usuario a agregar existe
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        // Obtener usuario actual
        const currentUser = await User.findById(currentUserId);

        // Verificar si ya está en favoritos
        const isFavorite = currentUser.usuariosFavoritos.some(
            favId => favId.toString() === userId
        );

        if (isFavorite) {
            // Quitar de favoritos
            currentUser.usuariosFavoritos = currentUser.usuariosFavoritos.filter(
                favId => favId.toString() !== userId
            );
            await currentUser.save();

            return res.json(formatSuccessResponse('Usuario quitado de favoritos', {
                isFavorite: false,
                usuariosFavoritos: currentUser.usuariosFavoritos
            }));
        } else {
            // Agregar a favoritos
            currentUser.usuariosFavoritos.push(userId);
            await currentUser.save();

            return res.json(formatSuccessResponse('Usuario agregado a favoritos', {
                isFavorite: true,
                usuariosFavoritos: currentUser.usuariosFavoritos
            }));
        }
    } catch (error) {
        console.error('Error al toggle favorito:', error);
        res.status(500).json(formatErrorResponse('Error al procesar favorito', [error.message]));
    }
};

/**
 * Obtener usuarios favoritos
 * GET /api/favoritos/usuarios
 */
const getFavoriteUsers = async (req, res) => {
    try {
        const currentUserId = req.userId;

        const user = await User.findById(currentUserId)
            .populate({
                path: 'usuariosFavoritos',
                select: 'nombres.primero apellidos.primero social.fotoPerfil username amigos social.stats eclesiastico.rolPrincipal eclesiastico.ministerios fundacion.cargo'
            });

        if (!user) {
            return res.status(404).json(formatErrorResponse('Usuario no encontrado'));
        }

        res.json(formatSuccessResponse('Usuarios favoritos obtenidos', user.usuariosFavoritos));
    } catch (error) {
        console.error('Error al obtener favoritos:', error);
        res.status(500).json(formatErrorResponse('Error al obtener favoritos', [error.message]));
    }
};

/**
 * Verificar si un usuario es favorito
 * GET /api/favoritos/usuario/:userId/check
 */
const checkIsFavorite = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { userId } = req.params;

        const user = await User.findById(currentUserId);

        const isFavorite = user.usuariosFavoritos.some(
            favId => favId.toString() === userId
        );

        res.json(formatSuccessResponse('Estado verificado', { isFavorite }));
    } catch (error) {
        console.error('Error al verificar favorito:', error);
        res.status(500).json(formatErrorResponse('Error al verificar favorito', [error.message]));
    }
};

module.exports = {
    toggleFavoriteUser,
    getFavoriteUsers,
    checkIsFavorite
};
