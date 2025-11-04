const { Schema, model } = require('mongoose');

const postSchema = new Schema({
  autor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 5000
  },
  imagenes: [{
    url: String,
    descripcion: String
  }],
  documentos: [{
    url: String,
    nombre: String,
    tipo: String
  }],
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'video', 'documento', 'evento'],
    default: 'texto'
  },
  visibilidad: {
    type: String,
    enum: ['publico', 'amigos', 'privado'],
    default: 'publico'
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comentarios: [{
    autor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    contenido: String,
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  compartido: {
    type: Boolean,
    default: false
  },
  postOriginal: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  etiquetas: [String],
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices para optimización
postSchema.index({ autor: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = model('Post', postSchema);
