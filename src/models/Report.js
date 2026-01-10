const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// ==========================================
// 🔹 ENUMS Y CONSTANTES
// ==========================================

// Tipos de contenido que se pueden reportar
const REPORT_CONTENT_TYPES = ['post', 'comment', 'profile', 'message'];

// Estados del reporte
const REPORT_STATUSES = ['pendiente', 'en_revision', 'valido', 'no_valido', 'duplicado', 'escalado'];

// Niveles de prioridad
const PRIORITY_LEVELS = ['alta', 'media', 'baja'];

// Motivos principales de reporte (inspirados en Instagram, Facebook, X)
const REPORT_REASONS = [
    'no_me_gusta',
    'bullying_acoso',
    'contacto_no_deseado',
    'violencia',
    'odio',
    'autolesion_suicidio',
    'desnudez_actividad_sexual',
    'estafa_fraude_spam',
    'informacion_falsa',
    'propiedad_intelectual'
];

// Submotivos por categoría
const REPORT_SUBREASONS = {
    'bullying_acoso': [
        'amenazas',
        'hostigamiento',
        'acoso_sexual',
        'intimidacion'
    ],
    'violencia': [
        'violencia_explicita',
        'violencia_grafica',
        'amenazas_violencia',
        'incitacion_violencia'
    ],
    'odio': [
        'discurso_odio',
        'discriminacion',
        'simbolos_odio',
        'incitacion_odio'
    ],
    'autolesion_suicidio': [
        'autolesion',
        'suicidio',
        'trastornos_alimenticios',
        'glorificacion_autolesion'
    ],
    'desnudez_actividad_sexual': [
        'desnudez',
        'actividad_sexual',
        'contenido_sexual_menores',
        'explotacion_sexual'
    ],
    'estafa_fraude_spam': [
        'estafa',
        'fraude',
        'spam',
        'phishing',
        'contenido_comercial_no_deseado'
    ],
    'informacion_falsa': [
        'desinformacion',
        'noticias_falsas',
        'manipulacion_medios',
        'suplantacion_identidad'
    ],
    'propiedad_intelectual': [
        'derechos_autor',
        'marca_registrada',
        'plagio',
        'uso_no_autorizado'
    ]
};

// Acciones de moderación disponibles
const MODERATOR_ACTIONS = [
    'ocultar_contenido',
    'eliminar_contenido',
    'advertir_usuario',
    'suspension_1_dia',
    'suspension_3_dias',
    'suspension_7_dias',
    'suspension_30_dias',
    'suspension_permanente',
    'escalar_founder',
    'ninguna_accion'
];

// ==========================================
// 🔹 SUB-SCHEMAS
// ==========================================

// Snapshot del contenido reportado (para preservar evidencia)
const ContentSnapshotSchema = new Schema({
    originalId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: REPORT_CONTENT_TYPES, required: true },
    content: { type: Schema.Types.Mixed, required: true }, // Contenido completo en el momento del reporte
    author: {
        userId: { type: Schema.Types.ObjectId, ref: 'UserV2', required: true },
        username: { type: String },
        nombreCompleto: { type: String }
    },
    createdAt: { type: Date },
    metadata: { type: Schema.Types.Mixed } // Información adicional (ej. imágenes, videos, etc.)
}, { _id: false });

// Historial de acciones sobre el reporte
const ActionHistorySchema = new Schema({
    action: { type: String, required: true }, // Tipo de acción realizada
    performedBy: { type: Schema.Types.ObjectId, ref: 'UserV2', required: true },
    performedByName: { type: String }, // Cache del nombre para auditoría
    timestamp: { type: Date, default: Date.now },
    previousState: { type: String }, // Estado anterior
    newState: { type: String }, // Nuevo estado
    justification: { type: String, trim: true }, // Justificación obligatoria
    metadata: { type: Schema.Types.Mixed } // Información adicional
}, { _id: false });

// ==========================================
// 🔹 SCHEMA PRINCIPAL
// ==========================================

const ReportSchema = new Schema({
    // Identificación del reporte
    reportNumber: {
        type: String,
        unique: true,
        required: true
    },

    // Contenido reportado (snapshot preservado)
    contentSnapshot: {
        type: ContentSnapshotSchema,
        required: true
    },

    // Usuario que reporta
    reportedBy: {
        userId: { type: Schema.Types.ObjectId, ref: 'UserV2', required: true },
        username: { type: String },
        timestamp: { type: Date, default: Date.now }
    },

    // Clasificación del reporte
    classification: {
        reason: {
            type: String,
            enum: REPORT_REASONS,
            required: true
        },
        subreason: {
            type: String,
            validate: {
                validator: function (v) {
                    if (!v) return true; // Subreason es opcional
                    const validSubreasons = REPORT_SUBREASONS[this.classification.reason] || [];
                    return validSubreasons.includes(v);
                },
                message: 'Submotivo no válido para este motivo principal'
            }
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },

    // Estado del reporte
    status: {
        type: String,
        enum: REPORT_STATUSES,
        default: 'pendiente',
        index: true
    },

    // Prioridad (calculada automáticamente según el motivo)
    priority: {
        type: String,
        enum: PRIORITY_LEVELS,
        default: 'baja',
        index: true
    },

    // Moderación
    moderation: {
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'UserV2',
            index: true
        },
        assignedAt: { type: Date },
        reviewedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'UserV2' },

        // Decisión final
        decision: {
            isValid: { type: Boolean },
            action: {
                type: String,
                enum: MODERATOR_ACTIONS
            },
            justification: {
                type: String,
                trim: true,
                required: function () {
                    return this.moderation && this.moderation.decision && this.moderation.decision.isValid !== undefined;
                }
            },
            appliedAt: { type: Date }
        }
    },

    // Historial completo de acciones (trazabilidad)
    actionHistory: {
        type: [ActionHistorySchema],
        default: []
    },

    // Flags especiales
    flags: {
        isEscalated: { type: Boolean, default: false }, // Escalado al Founder
        isDuplicate: { type: Boolean, default: false }, // Es duplicado de otro reporte
        duplicateOf: { type: Schema.Types.ObjectId, ref: 'Report' }, // Referencia al reporte original
        aiSuggestion: { type: Schema.Types.Mixed } // Preparado para sugerencias de IA
    },

    // Metadata adicional
    metadata: {
        userAgent: { type: String },
        ipAddress: { type: String },
        platform: { type: String } // web, mobile, android, ios
    }

}, {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==========================================
// 🔹 MIDDLEWARE Y MÉTODOS
// ==========================================

// Auto-generar número de reporte antes de guardar
ReportSchema.pre('save', async function (next) {
    if (this.isNew && !this.reportNumber) {
        const count = await this.constructor.countDocuments();
        this.reportNumber = `RPT-${Date.now()}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Calcular prioridad automáticamente según el motivo
ReportSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('classification.reason')) {
        const reason = this.classification.reason;

        // Alta prioridad
        const highPriority = ['violencia', 'autolesion_suicidio', 'odio'];
        // Media prioridad
        const mediumPriority = ['bullying_acoso', 'desnudez_actividad_sexual', 'contacto_no_deseado'];

        if (highPriority.includes(reason)) {
            this.priority = 'alta';
        } else if (mediumPriority.includes(reason)) {
            this.priority = 'media';
        } else {
            this.priority = 'baja';
        }
    }
    next();
});

// Método para agregar una acción al historial
ReportSchema.methods.addActionToHistory = function (action, performedBy, justification, metadata = {}) {
    const actionEntry = {
        action,
        performedBy: performedBy._id || performedBy,
        performedByName: performedBy.nombreCompleto || performedBy.username || 'Sistema',
        previousState: this.status,
        justification,
        metadata
    };

    this.actionHistory.push(actionEntry);
    return actionEntry;
};

// Virtual para obtener el tiempo transcurrido
ReportSchema.virtual('timeElapsed').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return 'hace menos de 1 hora';
});

// ==========================================
// 🔹 ÍNDICES PARA OPTIMIZACIÓN
// ==========================================

// Búsqueda por estado y prioridad (para dashboard de moderación)
ReportSchema.index({ status: 1, priority: -1, createdAt: -1 });

// Búsqueda por moderador asignado
ReportSchema.index({ 'moderation.assignedTo': 1, status: 1 });

// Búsqueda por usuario reportado
ReportSchema.index({ 'contentSnapshot.author.userId': 1 });

// Búsqueda por usuario que reporta
ReportSchema.index({ 'reportedBy.userId': 1 });

// ==========================================
// 🔹 EXPORTAR MODELO Y CONSTANTES
// ==========================================

const Report = model('Report', ReportSchema);

module.exports = {
    Report,
    REPORT_CONTENT_TYPES,
    REPORT_STATUSES,
    PRIORITY_LEVELS,
    REPORT_REASONS,
    REPORT_SUBREASONS,
    MODERATOR_ACTIONS
};
