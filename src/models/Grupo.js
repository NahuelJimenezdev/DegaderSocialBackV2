const { Schema, model } = require('mongoose');

const grupoSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    maxlength: 2000
  },
  creador: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imagen: {
    type: String
  },
  tipo: {
    type: String,
    enum: ['publico', 'privado', 'secreto'],
    default: 'publico'
  },
  categoria: {
    type: String,
    enum: ['academico', 'social', 'deportivo', 'cultural', 'profesional', 'otro'],
    default: 'otro'
  },
  miembros: [{
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rol: {
      type: String,
      enum: ['admin', 'moderador', 'miembro'],
      default: 'miembro'
    },
    fechaUnion: {
      type: Date,
      default: Date.now
    }
  }],
  solicitudesPendientes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reglas: {
    type: String,
    maxlength: 3000
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
grupoSchema.index({ nombre: 'text', descripcion: 'text' });
grupoSchema.index({ tipo: 1, activo: 1 });

module.exports = model('Grupo', grupoSchema);
