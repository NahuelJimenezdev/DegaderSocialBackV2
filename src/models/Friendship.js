const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  solicitante: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  receptor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
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
  timestamps: true
});

// Índice compuesto para evitar solicitudes duplicadas
friendshipSchema.index({ solicitante: 1, receptor: 1 }, { unique: true });
friendshipSchema.index({ receptor: 1, estado: 1 });
friendshipSchema.index({ solicitante: 1, estado: 1 });

// Validación para evitar auto-amistad
friendshipSchema.pre('save', function (next) {
  if (this.solicitante.equals(this.receptor)) {
    next(new Error('No puedes enviarte una solicitud de amistad a ti mismo'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Friendship', friendshipSchema);
