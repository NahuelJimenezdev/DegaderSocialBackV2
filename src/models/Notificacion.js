const { Schema, model } = require('mongoose');

const notificacionSchema = new Schema({
  destinatario: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emisor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  tipo: {
    type: String,
    enum: [
      'amistad_solicitud',
      'amistad_aceptada',
      'post_like',
      'post_comentario',
      'mensaje_nuevo',
      'evento_invitacion',
      'grupo_invitacion',
      'mencion',
      'sistema'
    ],
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  referencia: {
    tipo: String, // 'Post', 'Evento', 'Grupo', etc.
    id: Schema.Types.ObjectId
  },
  leida: {
    type: Boolean,
    default: false
  },
  fechaLectura: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
notificacionSchema.index({ destinatario: 1, leida: 1, createdAt: -1 });

module.exports = model('Notificacion', notificacionSchema);
