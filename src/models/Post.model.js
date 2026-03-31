const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  contenido: {
    type: String,
    maxlength: 500
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Para soportar respuestas (2 niveles: comentario → respuesta)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  image: {
    type: String,
    default: null
  }
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
    small: { type: String, trim: true },
    medium: { type: String, trim: true },
    large: { type: String, trim: true },
    blurHash: { type: String, trim: true },
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
    enum: ['original', 'compartido', 'cumpleaños'],
    default: 'original'
  },
  postOriginal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  likes: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'UserV2',
    description: 'DEPRECATED: Usar colección PostLike para nuevos likes.'
  },
  comentarios: {
    type: [commentSchema],
    description: 'DEPRECATED: Usar colección PostComment para nuevos comentarios.'
  },
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
  // --- NUEVOS CAMPOS PARA ESCALABILIDAD (Fase 1) ---
  likesCount: {
    type: Number,
    default: 0,
    index: true
  },
  commentsCount: {
    type: Number,
    default: 0,
    index: true
  },
  sharesCount: {
    type: Number,
    default: 0
  },
  etiquetas: [{
    type: String,
    trim: true
  }],
  grupo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  // --- CAMPOS ESPECIALES (Post Personalizados) ---
  metadatos: {
    title: String,
    titleFont: String,
    textFont: String,
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    }
  },
  // --- RANKING INTELIGENTE ---
  relevanceScore: {
    type: Number,
    default: 0,
    index: true
  },
  // --- HYBRID SNAPSHOTS (Fase 5) ---
  comentariosRecientes: [{
    _id: mongoose.Schema.Types.ObjectId,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    contenido: String,
    image: String,
    likesCount: { type: Number, default: 0 },
    createdAt: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para contar likes (Usando contador optimizado Fase 1)
postSchema.virtual('totalLikes').get(function () {
  return this.likesCount || 0;
});

// Virtual para contar comentarios (Usando contador optimizado Fase 1)
postSchema.virtual('totalComentarios').get(function () {
  return this.commentsCount || 0;
});

// Virtual para contar compartidos
postSchema.virtual('totalCompartidos').get(function () {
  return this.compartidos?.length || 0;
});

// Índices
postSchema.index({ usuario: 1, createdAt: -1 });
postSchema.index({ grupo: 1, createdAt: -1 });
postSchema.index({ etiquetas: 1 });
postSchema.index({ createdAt: -1, _id: -1 }); // 🆕 Clave para Cursor Pagination a escala

module.exports = mongoose.model('Post', postSchema);
