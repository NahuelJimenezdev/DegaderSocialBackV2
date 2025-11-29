const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 500
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }]
}, {
  timestamps: true
});

const postSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  contenido: {
    type: String,
    required: [true, 'El contenido es obligatorio'],
    maxlength: 5000
  },
  // DEPRECATED: Campo legacy para compatibilidad. Usar 'images' en su lugar.
  imagen: {
    type: String,
    default: null
  },
  // Nuevos campos para soportar múltiples imágenes y videos (base64)
  images: [{
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: '', trim: true }
  }],
  videos: [{
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true }
  }],
  privacidad: {
    type: String,
    enum: ['publico', 'amigos', 'privado'],
    default: 'publico'
  },
  tipo: {
    type: String,
    enum: ['original', 'compartido'],
    default: 'original'
  },
  postOriginal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  comentarios: [commentSchema],
  compartidos: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  etiquetas: [{
    type: String,
    trim: true
  }],
  grupo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para contar likes
postSchema.virtual('totalLikes').get(function () {
  return this.likes.length;
});

// Virtual para contar comentarios
postSchema.virtual('totalComentarios').get(function () {
  return this.comentarios.length;
});

// Virtual para contar compartidos
postSchema.virtual('totalCompartidos').get(function () {
  return this.compartidos.length;
});

// Índices
postSchema.index({ usuario: 1, createdAt: -1 });
postSchema.index({ grupo: 1, createdAt: -1 });
postSchema.index({ etiquetas: 1 });

module.exports = mongoose.model('Post', postSchema);
