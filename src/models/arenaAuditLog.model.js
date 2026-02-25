const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ArenaAuditLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'UserV2',
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['info', 'warn', 'error', 'critical'],
        default: 'info'
    },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed }, // Información variable según la acción
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // Solo usamos createdAt
});

module.exports = model('ArenaAuditLog', ArenaAuditLogSchema);
