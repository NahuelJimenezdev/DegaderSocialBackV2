const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    moderador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    accion: {
        type: String,
        required: true,
        enum: [
            'levantar_suspension',
            'suspender_usuario',
            'eliminar_post',
            'eliminar_comentario',
            'resolver_ticket',
            'rechazar_ticket',
            'asignar_ticket',
            'cambiar_rol',
            'crear_usuario',
            'eliminar_usuario',
            'editar_usuario',
            'acceso_denegado',
            'otro'
        ],
        index: true
    },
    objetivo: {
        tipo: {
            type: String,
            enum: ['usuario', 'post', 'comentario', 'ticket', 'reporte', 'otro'],
            required: true
        },
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        nombre: String // Nombre descriptivo del objetivo (username, título post, etc.)
    },
    detalles: {
        type: mongoose.Schema.Types.Mixed, // Flexible para diferentes tipos de detalles
        default: {}
    },
    // Campos adicionales útiles
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Índices compuestos para búsquedas frecuentes
auditLogSchema.index({ moderador: 1, timestamp: -1 });
auditLogSchema.index({ 'objetivo.tipo': 1, 'objetivo.id': 1 });
auditLogSchema.index({ accion: 1, timestamp: -1 });

// Método estático para crear log de forma sencilla
auditLogSchema.statics.registrar = async function (data) {
    const log = new this({
        moderador: data.moderadorId,
        accion: data.accion,
        objetivo: {
            tipo: data.objetivoTipo,
            id: data.objetivoId,
            nombre: data.objetivoNombre
        },
        detalles: data.detalles || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
    });

    return await log.save();
};

// Virtual para descripción legible
auditLogSchema.virtual('descripcion').get(function () {
    const acciones = {
        'levantar_suspension': 'levantó la suspensión de',
        'suspender_usuario': 'suspendió a',
        'eliminar_post': 'eliminó la publicación de',
        'eliminar_comentario': 'eliminó el comentario de',
        'resolver_ticket': 'resolvió el ticket de',
        'rechazar_ticket': 'rechazó el ticket de',
        'asignar_ticket': 'se asignó el ticket de',
        'cambiar_rol': 'cambió el rol de',
        'otro': 'realizó una acción sobre'
    };

    return `${acciones[this.accion] || 'actuó sobre'} ${this.objetivo.nombre || this.objetivo.tipo}`;
});

// Incluir virtuals en JSON
auditLogSchema.set('toJSON', { virtuals: true });
auditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
