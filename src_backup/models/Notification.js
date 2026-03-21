const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receptor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },
  emisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  tipo: {
    type: String,
    required: true,
    index: true
    // El enum se mantiene dinámico para permitir nuevos tipos sin bloqueos de esquema
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 500
  },
  referencia: {
    tipo: {
      type: String,
      enum: ['Post', 'UserV2', 'Group', 'Conversation', 'Comment', 'Meeting', 'Iglesia', 'Ad', 'Ministerio']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referencia.tipo'
    }
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false,
    index: true
  },
  pushSent: {
    type: Boolean,
    default: false,
    index: true
  },
  fechaLeida: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    index: { expires: 0 } // Permite TTL dinámico seteando la fecha de expiración
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- TTL Dinámico (Auto-limpieza) ---
// El campo expiresAt controla cuándo se elimina cada notificación individualmente
// notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: ... }); // ELIMINADO en favor de expiresAt

// --- Compatibilidad V1 (Legacy Aliases) ---
notificationSchema.virtual('leida').get(function() {
  return this.read;
}).set(function(val) {
  this.read = val;
});

// Índices Compuestos para Rendimiento
notificationSchema.index({ receptor: 1, read: 1, createdAt: -1 });
notificationSchema.index({ receptor: 1, tipo: 1 });
notificationSchema.index({ 'metadata.eventId': 1 }, { unique: true, sparse: true }); // Idempotencia Estricta

// Métodos
notificationSchema.methods.marcarLeida = function () {
  this.read = true;
  this.fechaLeida = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
