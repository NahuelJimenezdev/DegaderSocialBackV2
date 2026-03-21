const mongoose = require('mongoose');

const postCommentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },
  contenido: {
    type: String,
    required: [true, 'El contenido del comentario es obligatorio'],
    maxlength: 1000,
    trim: true
  },
  // Imagen opcional en el comentario
  image: {
    type: String,
    default: null
  },
  // Soporte para hilos (comentario -> respuesta)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostComment',
    default: null,
    index: true
  },
  // Contador de likes del propio comentario (para ranking futuro)
  likesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para consultas rápidas de hilos
postCommentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

module.exports = mongoose.model('PostComment', postCommentSchema);
