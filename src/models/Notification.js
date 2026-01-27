const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receptor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  emisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  tipo: {
    type: String,
    enum: [
      'solicitud_amistad',
      'solicitud_cancelada',
      'amistad_aceptada',
      'amistad_eliminada',
      'like_post',
      'comentario_post',
      'compartir_post',
      'mencion',
      'invitacion_grupo',
      'solicitud_grupo',
      'solicitud_grupo_aprobada',
      'solicitud_grupo_rechazada',
      'promocion_admin_grupo',
      'nuevo_miembro_grupo',
      'nuevo_mensaje',
      'mensaje_pendiente',
      'evento',
      'sistema',
      'respuesta_comentario',
      'like_comentario',
      'solicitud_iglesia',
      'solicitud_iglesia_aprobada',
      'solicitud_iglesia_rechazada',
      'solicitud_fundacion',
      'solicitud_fundacion_aprobada',
      'solicitud_fundacion_rechazada',
      'nuevo_anuncio',
      'alerta_seguridad',
      'post_editado'
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
      enum: ['Post', 'UserV2', 'Group', 'Conversation', 'Comment', 'Meeting', 'Iglesia', 'Ad']
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
notificationSchema.methods.marcarLeida = function () {
  this.leida = true;
  this.fechaLeida = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
