const IglesiaTestimonial = require('../models/IglesiaTestimonial');
const Iglesia = require('../models/Iglesia');
const UserV2 = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Obtener testimonios de una iglesia
 * GET /api/iglesias/:id/testimonios
 */
const obtenerTestimonios = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

        // Obtener los últimos 3 testimonios para la home, o todos si es paginado (por ahora todos para simpleza)
        const testimonios = await IglesiaTestimonial.find({ iglesia: id, activo: true })
            .populate('usuario', 'nombres apellidos social.fotoPerfil eclesiastico fundacion')
            .sort({ createdAt: -1 })
            .limit(10); // Límite inicial

        res.json(formatSuccessResponse('Testimonios obtenidos', testimonios));
    } catch (error) {
        console.error('Error al obtener testimonios:', error);
        res.status(500).json(formatErrorResponse('Error al obtener testimonios'));
    }
};

/**
 * Crear un testimonio (Solo miembros)
 * POST /api/iglesias/:id/testimonios
 */
const crearTestimonio = async (req, res) => {
    try {
        const { id } = req.params;
        const { mensaje } = req.body;
        const usuarioId = req.userId;

        if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));
        if (!mensaje || mensaje.trim().length === 0) return res.status(400).json(formatErrorResponse('El mensaje es obligatorio'));

        // Verificar membresía
        const iglesia = await Iglesia.findById(id);
        if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

        const esMiembro = iglesia.miembros.includes(usuarioId);
        const esPastor = iglesia.pastorPrincipal.toString() === usuarioId;

        if (!esMiembro && !esPastor) {
            return res.status(403).json(formatErrorResponse('Solo los miembros pueden dejar comentarios'));
        }

        // Verificar si ya existe
        const existente = await IglesiaTestimonial.findOne({ iglesia: id, usuario: usuarioId });
        if (existente) {
            return res.status(400).json(formatErrorResponse('Ya has dejado un comentario en esta iglesia'));
        }

        const nuevoTestimonio = new IglesiaTestimonial({
            iglesia: id,
            usuario: usuarioId,
            mensaje
        });

        await nuevoTestimonio.save();

        // Poblar datos para devolverlo listo para UI
        await nuevoTestimonio.populate('usuario', 'nombres apellidos social.fotoPerfil eclesiastico fundacion');

        res.status(201).json(formatSuccessResponse('Comentario publicado', nuevoTestimonio));
    } catch (error) {
        console.error('Error al crear testimonio:', error);
        res.status(500).json(formatErrorResponse('Error al publicar comentario'));
    }
};

/**
 * Actualizar testimonio
 * PUT /api/iglesias/:id/testimonios/:testimonioId
 */
const actualizarTestimonio = async (req, res) => {
    try {
        const { testimonioId } = req.params;
        const { mensaje } = req.body;
        const usuarioId = req.userId;

        if (!mensaje || mensaje.trim().length === 0) return res.status(400).json(formatErrorResponse('El mensaje es obligatorio'));

        const testimonio = await IglesiaTestimonial.findById(testimonioId);
        if (!testimonio) return res.status(404).json(formatErrorResponse('Comentario no encontrado'));

        if (testimonio.usuario.toString() !== usuarioId) {
            return res.status(403).json(formatErrorResponse('No tienes permiso para editar este comentario'));
        }

        testimonio.mensaje = mensaje;
        await testimonio.save();
        await testimonio.populate('usuario', 'nombres apellidos social.fotoPerfil eclesiastico fundacion');

        res.json(formatSuccessResponse('Comentario actualizado', testimonio));
    } catch (error) {
        console.error('Error al actualizar testimonio:', error);
        res.status(500).json(formatErrorResponse('Error al actualizar comentario'));
    }
};

/**
 * Eliminar testimonio
 * DELETE /api/iglesias/:id/testimonios/:testimonioId
 */
const eliminarTestimonio = async (req, res) => {
    try {
        const { testimonioId } = req.params;
        const usuarioId = req.userId;

        const testimonio = await IglesiaTestimonial.findById(testimonioId);
        if (!testimonio) return res.status(404).json(formatErrorResponse('Comentario no encontrado'));

        if (testimonio.usuario.toString() !== usuarioId) {
            return res.status(403).json(formatErrorResponse('No tienes permiso para eliminar este comentario'));
        }

        await IglesiaTestimonial.findByIdAndDelete(testimonioId);

        res.json(formatSuccessResponse('Comentario eliminado'));
    } catch (error) {
        console.error('Error al eliminar testimonio:', error);
        res.status(500).json(formatErrorResponse('Error al eliminar comentario'));
    }
};

module.exports = {
    obtenerTestimonios,
    crearTestimonio,
    actualizarTestimonio,
    eliminarTestimonio
};
