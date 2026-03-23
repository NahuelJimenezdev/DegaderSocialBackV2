const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participantes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  }],
  tipo: {
    type: String,
    enum: ['privada', 'grupo'],
    default: 'privada'
  },
  nombre: {
    type: String,
    trim: true
  },
  imagen: {
    type: String
  },
  ultimoMensaje: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  mensajesNoLeidos: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    cantidad: {
      type: Number,
      default: 0
    }
  }],
  activa: {
    type: Boolean,
    default: true
  },
  configuracion: {
    notificaciones: { type: Boolean, default: true },
    silenciada: { type: Boolean, default: false }
  },
  // Estado de solicitud de mensaje (para personas que no son amigas)
  messageRequestStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted'],
    default: 'none'
  },
  // Usuario que inició la conversación (para saber quién envió la solicitud)
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  },
  // Usuarios que archivaron esta conversación
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Usuarios que destacaron esta conversación (con estrella)
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Usuarios que eliminaron esta conversación (solo para ellos)
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Registro de cuando cada usuario vació la conversación
  clearedBy: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
conversationSchema.index({ participantes: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
