const { Schema, model } = require('mongoose');

const resourceSchema = new Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['documento', 'video', 'enlace', 'imagen', 'presentacion', 'otro'],
    required: true
  },
  url: {
    type: String
  },
  archivo: {
    nombre: String,
    url: String,
    tamaño: Number
  },
  categoria: {
    type: String,
    enum: ['academico', 'administrativo', 'institucional', 'biblioteca', 'otro'],
    default: 'otro'
  },
  etiquetas: [String],
  autor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  area: {
    type: Schema.Types.ObjectId,
    ref: 'Area'
  },
  visibilidad: {
    type: String,
    enum: ['publico', 'institucional', 'restringido'],
    default: 'institucional'
  },
  descargas: {
    type: Number,
    default: 0
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
resourceSchema.index({ titulo: 'text', descripcion: 'text', etiquetas: 'text' });
resourceSchema.index({ categoria: 1, activo: 1 });

module.exports = model('Resource', resourceSchema);
