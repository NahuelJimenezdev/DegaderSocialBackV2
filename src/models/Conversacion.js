const { Schema, model } = require('mongoose');

const mensajeSchema = new Schema({
  emisor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  leido: {
    type: Boolean,
    default: false
  },
  fechaLectura: {
    type: Date
  }
}, {
  timestamps: true
});

const conversacionSchema = new Schema({
  participantes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tipo: {
    type: String,
    enum: ['individual', 'grupo'],
    default: 'individual'
  },
  nombre: {
    type: String // Para conversaciones grupales
  },
  mensajes: [mensajeSchema],
  ultimoMensaje: {
    type: Date,
    default: Date.now
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
conversacionSchema.index({ participantes: 1 });
conversacionSchema.index({ ultimoMensaje: -1 });

module.exports = model('Conversacion', conversacionSchema);
