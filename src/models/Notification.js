const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receptor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: [
      'solicitud_amistad',
      'amistad_aceptada',
      'like_post',
      'comentario_post',
      'compartir_post',
      'mencion',
      'invitacion_grupo',
      'solicitud_grupo',
      'solicitud_grupo_aprobada',
      'solicitud_grupo_rechazada',
      'nuevo_miembro_grupo',
      'nuevo_mensaje',
      'evento',
      'sistema'
    ],
    required: true
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 500
  },
  referencia: {
    tipo: {
      type: String,
      enum: ['Post', 'User', 'Group', 'Conversation', 'Comment']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referencia.tipo'
    }
  },
  leida: {
    type: Boolean,
    default: false
  },
  fechaLeida: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices
notificationSchema.index({ receptor: 1, leida: 1, createdAt: -1 });
notificationSchema.index({ receptor: 1, tipo: 1 });

// Método para marcar como leída
notificationSchema.methods.marcarLeida = function() {
  this.leida = true;
  this.fechaLeida = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
