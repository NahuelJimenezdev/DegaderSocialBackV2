const mongoose = require('mongoose');

const ticketResponseSchema = new mongoose.Schema({
    autor: {
        tipo: {
            type: String,
            enum: ['usuario', 'moderador'],
            required: true
        },
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    contenido: {
        type: String,
        required: true,
        maxlength: 2000
    },
    adjuntos: [{
        tipo: {
            type: String,
            enum: ['imagen', 'documento']
        },
        url: String,
        nombre: String
    }],
    creadoEn: {
        type: Date,
        default: Date.now
    }
});

const ticketSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['apelacion', 'reporte_bug', 'consulta', 'otro'],
        required: true,
        default: 'consulta'
    },
    estado: {
        type: String,
        enum: ['abierto', 'en_revision', 'resuelto', 'rechazado', 'cerrado'],
        required: true,
        default: 'abierto',
        index: true
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta', 'urgente'],
        default: 'media'
    },
    asunto: {
        type: String,
        required: true,
        maxlength: 200
    },
    descripcion: {
        type: String,
        required: true,
        maxlength: 2000
    },
    adjuntos: [{
        tipo: {
            type: String,
            enum: ['imagen', 'documento']
        },
        url: String,
        nombre: String
    }],
    respuestas: [ticketResponseSchema],
    // Referencia a la suspensión si es apelación
    suspensionRelacionada: {
        fechaSuspension: Date,
        fechaFinSuspension: Date,
        motivoSuspension: String
    },
    // Moderador asignado (opcional)
    moderadorAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Resolución final
    resolucion: {
        aprobado: Boolean,
        motivo: String,
        resueltoEn: Date,
        resuelto_por: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true
});

// Índices compuestos para búsquedas eficientes
ticketSchema.index({ usuario: 1, estado: 1 });
ticketSchema.index({ tipo: 1, estado: 1 });
ticketSchema.index({ createdAt: -1 });

// Método para agregar respuesta
ticketSchema.methods.agregarRespuesta = function (autorInfo, contenido, adjuntos = []) {
    this.respuestas.push({
        autor: autorInfo,
        contenido,
        adjuntos
    });

    // Si es el moderador respondiendo, cambiar a "en_revision"
    if (this.estado === 'abierto' && autorInfo.tipo === 'moderador') {
        this.estado = 'en_revision';
    }

    return this.save();
};

// Método para resolver ticket
ticketSchema.methods.resolver = function (aprobado, motivo, moderadorId) {
    this.estado = aprobado ? 'resuelto' : 'rechazado';
    this.resolucion = {
        aprobado,
        motivo,
        resueltoEn: new Date(),
        resuelto_por: moderadorId
    };

    return this.save();
};

// Virtual para obtener número de respuestas
ticketSchema.virtual('numeroRespuestas').get(function () {
    return this.respuestas.length;
});

// Incluir virtuals en JSON
ticketSchema.set('toJSON', { virtuals: true });
ticketSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Ticket', ticketSchema);
