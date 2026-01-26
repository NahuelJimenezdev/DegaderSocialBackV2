const ChurchEvent = require('../models/ChurchEvent');
const Iglesia = require('../models/Iglesia');
const UserV2 = require('../models/User.model');

// Crear un evento
exports.createEvent = async (req, res) => {
    try {
        const { iglesiaId } = req.params;
        const eventData = req.body;

        // Verificar permisos
        const user = await UserV2.findById(req.user.id);
        if (!user || !user.esMiembroIglesia || !user.eclesiastico) {
            return res.status(403).json({ error: 'No tienes permisos para crear eventos en esta iglesia.' });
        }

        const allowedRoles = ['pastor_principal', 'lider', 'sublider', 'adminIglesia', 'director', 'coordinador'];
        const hasPrincipalRole = allowedRoles.includes(user.eclesiastico.rolPrincipal);

        // También verificar si tiene un cargo de liderazgo en algún ministerio
        const hasMinistryRole = user.eclesiastico.ministerios?.some(m =>
            m.activo && ['lider', 'sublider'].includes(m.cargo)
        );

        if (!hasPrincipalRole && !hasMinistryRole) {
            return res.status(403).json({ error: 'Debes tener un cargo de liderazgo (Pastor, Líder, Sublíder) para crear eventos.' });
        }

        const newEvent = new ChurchEvent({
            ...eventData,
            iglesia: iglesiaId,
            creator: req.user.id
        });

        await newEvent.save();

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating church event:', error);
        // Mongoose validation error handling
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Error al crear el evento', details: error.message });
    }
};

// Obtener eventos de una iglesia (filtrando 'No me interesa' para el usuario actual)
exports.getEventsByIglesia = async (req, res) => {
    try {
        const { iglesiaId } = req.params;
        const userId = req.user.id;

        const events = await ChurchEvent.find({
            iglesia: iglesiaId,
            notInterested: { $ne: userId } // Excluir si el usuario está en notInterested
        })
            .sort({ 'dates.0': 1 }) // Ordenar por la primera fecha
            .populate('creator', 'name email');

        res.json(events);
    } catch (error) {
        console.error('Error fetching church events:', error);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
};

// Interactuar con el evento (Recordar, Asistiré, No me interesa)
exports.interactWithEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { action } = req.body; // 'remind', 'attend', 'dismiss'
        const userId = req.user.id;

        const event = await ChurchEvent.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

        // Limpiar estados anteriores para evitar duplicados lógicos (ej: si pongo Asistiré, quito Recordar?)
        // Requerimiento: "La diferencia es que Recordar indica interés... Asistiré es firme."
        // Podemos permitir ambos o switch. Vamos a hacer que sean excluyentes para simplificar la UI:
        // O estás "Asistiré", o "Recordar", o nada.

        // Remover de todos los arrays primero
        event.attendees = event.attendees.filter(a => a.user.toString() !== userId);
        event.reminders = event.reminders.filter(r => r.user.toString() !== userId);
        event.notInterested = event.notInterested.filter(u => u.toString() !== userId);

        if (action === 'attend') {
            event.attendees.push({ user: userId });
        } else if (action === 'remind') {
            event.reminders.push({ user: userId });
        } else if (action === 'dismiss') {
            event.notInterested.push(userId);
        }
        // Si action es 'cancel' o null, simplemente se queda limpio (removido de todo)

        await event.save();

        res.json({ success: true, stats: event.stats });
    } catch (error) {
        console.error('Error interacting with event:', error);
        res.status(500).json({ error: 'Error al interactuar con el evento' });
    }
};

// Actualizar un evento
exports.updateEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const updateData = req.body;
        const userId = req.user.id;

        const event = await ChurchEvent.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

        // Verificar si es el creador
        if (event.creator.toString() !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para editar este evento. Solo el creador puede hacerlo.' });
        }

        const updatedEvent = await ChurchEvent.findByIdAndUpdate(eventId, updateData, { new: true });
        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating church event:', error);
        res.status(500).json({ error: 'Error al actualizar el evento' });
    }
};

// Eliminar un evento (Cancelar)
exports.deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        const event = await ChurchEvent.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

        // Verificar si es el creador
        if (event.creator.toString() !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este evento. Solo el creador puede hacerlo.' });
        }

        // En lugar de borrar físicamente, podemos marcar como cancelado. 
        // Pero el modelo no tiene estado 'status'. 
        // Por ahora lo eliminaremos de la base de datos para simplificar, 
        // o podemos agregar el campo status al modelo si se requiere (pero implicaría migración).
        // El usuario pidió "Cancelar", a menudo esto es un estado.
        // Revisando MeetingCard, usa status 'cancelled'.
        // ChurchEvent no tiene status. Vamos a eliminarlo por ahora para limpiar.

        await ChurchEvent.findByIdAndDelete(eventId);
        res.json({ success: true, message: 'Evento eliminado exitosamente' });

    } catch (error) {
        console.error('Error deleting church event:', error);
        res.status(500).json({ error: 'Error al eliminar el evento' });
    }
};

// Obtener estadísticas (Solo creador)
exports.getEventStats = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id; // Del token

        const event = await ChurchEvent.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

        // Verificar si es el creador
        if (event.creator.toString() !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para ver estadísticas' });
        }

        res.json(event.stats);
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
