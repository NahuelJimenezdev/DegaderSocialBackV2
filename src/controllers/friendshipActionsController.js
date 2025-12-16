const Friendship = require('../models/Friendship');

// Toggle favorito
exports.toggleFavorite = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        // Check both req.user.userId and req.user._id to see which one is populated
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        // Verificar que el usuario es parte de la amistad
        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        // Toggle favorito según el rol del usuario
        if (!friendship.favoritos) {
            friendship.favoritos = { solicitante: false, receptor: false };
        }

        if (isSolicitante) {
            friendship.favoritos.solicitante = !friendship.favoritos.solicitante;
        } else {
            friendship.favoritos.receptor = !friendship.favoritos.receptor;
        }

        await friendship.save();

        const isFavorite = isSolicitante ? friendship.favoritos.solicitante : friendship.favoritos.receptor;

        res.json({
            success: true,
            message: isFavorite ? 'Agregado a favoritos' : 'Removido de favoritos',
            data: { isFavorite }
        });
    } catch (error) {
        console.error('Error al toggle favorito:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar favorito' });
    }
};

// Toggle fijado
exports.togglePin = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        if (!friendship.fijado) {
            friendship.fijado = { solicitante: false, receptor: false };
        }

        if (isSolicitante) {
            friendship.fijado.solicitante = !friendship.fijado.solicitante;
        } else {
            friendship.fijado.receptor = !friendship.fijado.receptor;
        }

        await friendship.save();

        const isPinned = isSolicitante ? friendship.fijado.solicitante : friendship.fijado.receptor;

        res.json({
            success: true,
            message: isPinned ? 'Amigo fijado' : 'Amigo desfijado',
            data: { isPinned }
        });
    } catch (error) {
        console.error('Error al toggle pin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar fijado' });
    }
};

// Toggle silenciado
exports.toggleMute = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        if (!friendship.silenciado) {
            friendship.silenciado = { solicitante: false, receptor: false };
        }

        if (isSolicitante) {
            friendship.silenciado.solicitante = !friendship.silenciado.solicitante;
        } else {
            friendship.silenciado.receptor = !friendship.silenciado.receptor;
        }

        await friendship.save();

        const isMuted = isSolicitante ? friendship.silenciado.solicitante : friendship.silenciado.receptor;

        res.json({
            success: true,
            message: isMuted ? 'Notificaciones silenciadas' : 'Notificaciones activadas',
            data: { isMuted }
        });
    } catch (error) {
        console.error('Error al toggle mute:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar silenciado' });
    }
};

// Eliminar amistad
exports.removeFriendship = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        await Friendship.findByIdAndDelete(friendshipId);

        res.json({
            success: true,
            message: 'Amistad eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar amistad:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar amistad' });
    }
};

// Bloquear usuario
exports.blockUser = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        // Cambiar estado a bloqueada y registrar quién bloqueó
        friendship.estado = 'bloqueada';
        friendship.bloqueadoPor = userId;

        // Opcional: Limpiar favoritos/fijados/silenciados al bloquear
        if (friendship.favoritos) {
            friendship.favoritos.solicitante = false;
            friendship.favoritos.receptor = false;
        }
        if (friendship.fijado) {
            friendship.fijado.solicitante = false;
            friendship.fijado.receptor = false;
        }

        await friendship.save();

        res.json({
            success: true,
            message: 'Usuario bloqueado correctamente'
        });
    } catch (error) {
        console.error('Error al bloquear usuario:', error);
        res.status(500).json({ success: false, message: 'Error al bloquear usuario' });
    }
};

// Desbloquear usuario
exports.unblockUser = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const userId = req.user.userId || req.user._id;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        const isSolicitante = friendship.solicitante.toString() === userId.toString();
        const isReceptor = friendship.receptor.toString() === userId.toString();

        if (!isSolicitante && !isReceptor) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        // Verificar si está bloqueada y si el usuario actual fue quien bloqueó
        if (friendship.estado !== 'bloqueada') {
            return res.status(400).json({ success: false, message: 'La amistad no está bloqueada' });
        }

        // Si existe bloqueadoPor, verificar que sea el mismo usuario
        if (friendship.bloqueadoPor && friendship.bloqueadoPor.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'No puedes desbloquear, tú no iniciaste el bloqueo' });
        }

        // Restaurar amistad a aceptada (o eliminarla si se prefiere resetear a desconocidos)
        // Según requerimiento de "volver a encontrarlo", asumimos restaurar a 'aceptada'
        friendship.estado = 'aceptada';
        friendship.bloqueadoPor = undefined; // Limpiar campo

        await friendship.save();

        res.json({
            success: true,
            message: 'Usuario desbloqueado correctamente'
        });
    } catch (error) {
        console.error('Error al desbloquear usuario:', error);
        res.status(500).json({ success: false, message: 'Error al desbloquear usuario' });
    }
};
