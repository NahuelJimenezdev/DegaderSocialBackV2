const { Schema, model } = require('mongoose');

const amistadSchema = new Schema({
  solicitante: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receptor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aceptada', 'rechazada', 'bloqueada'],
    default: 'pendiente'
  },
  fechaAceptacion: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices para búsquedas optimizadas
amistadSchema.index({ solicitante: 1, receptor: 1 }, { unique: true });
amistadSchema.index({ receptor: 1, estado: 1 });

module.exports = model('Amistad', amistadSchema);
