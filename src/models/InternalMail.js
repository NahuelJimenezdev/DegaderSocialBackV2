const { Schema, model } = require('mongoose');

const internalMailSchema = new Schema({
  asunto: {
    type: String,
    required: true,
    trim: true
  },
  contenido: {
    type: String,
    required: true
  },
  remitente: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destinatarios: [{
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    leido: {
      type: Boolean,
      default: false
    },
    fechaLectura: Date
  }],
  adjuntos: [{
    nombre: String,
    url: String,
    tipo: String,
    tamaño: Number
  }],
  prioridad: {
    type: String,
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal'
  },
  area: {
    type: Schema.Types.ObjectId,
    ref: 'Area'
  },
  tipo: {
    type: String,
    enum: ['interno', 'circular', 'notificacion', 'memorandum'],
    default: 'interno'
  },
  archivado: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
internalMailSchema.index({ 'destinatarios.usuario': 1, createdAt: -1 });
internalMailSchema.index({ remitente: 1, createdAt: -1 });

module.exports = model('InternalMail', internalMailSchema);
