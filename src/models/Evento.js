const { Schema, model } = require('mongoose');

const eventoSchema = new Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true
  },
  creador: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  ubicacion: {
    tipo: {
      type: String,
      enum: ['presencial', 'virtual', 'hibrido'],
      default: 'presencial'
    },
    direccion: String,
    urlVirtual: String
  },
  imagen: {
    type: String
  },
  categoria: {
    type: String,
    enum: ['institucional', 'academico', 'social', 'deportivo', 'cultural', 'otro'],
    default: 'otro'
  },
  capacidadMaxima: {
    type: Number
  },
  participantes: [{
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    estado: {
      type: String,
      enum: ['confirmado', 'pendiente', 'rechazado'],
      default: 'confirmado'
    },
    fechaRegistro: {
      type: Date,
      default: Date.now
    }
  }],
  visibilidad: {
    type: String,
    enum: ['publico', 'privado', 'institucional'],
    default: 'publico'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
eventoSchema.index({ fechaInicio: 1 });
eventoSchema.index({ categoria: 1, activo: 1 });

module.exports = model('Evento', eventoSchema);
