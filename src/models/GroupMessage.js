const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  emoji: {
    type: String,
    required: true
  }
}, { _id: false });

const groupMessageSchema = new mongoose.Schema({
  grupo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'archivo', 'video'],
    default: 'texto'
  },
  // Responder a otro mensaje
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupMessage',
    default: null
  },
  // Archivos adjuntos
  files: [{
    url: String,
    nombre: String,
    tipo: String,
    tamaño: Number
  }],
  // Reacciones al mensaje
  reactions: [reactionSchema],
  // Usuarios que destacaron este mensaje
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Mensajes leídos por usuarios
  readBy: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  // Mensaje eliminado
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
groupMessageSchema.index({ grupo: 1, createdAt: -1 });
groupMessageSchema.index({ author: 1 });

// Virtual para contar reacciones
groupMessageSchema.virtual('totalReactions').get(function () {
  return this.reactions ? this.reactions.length : 0;
});

// Método para agregar reacción
groupMessageSchema.methods.addReaction = function (usuarioId, emoji) {
  // Verificar si el usuario ya reaccionó con este emoji
  const existingReaction = this.reactions.find(
    r => r.usuario.equals(usuarioId) && r.emoji === emoji
  );

  if (existingReaction) {
    // Remover la reacción si ya existe
    this.reactions = this.reactions.filter(
      r => !(r.usuario.equals(usuarioId) && r.emoji === emoji)
    );
  } else {
    // Agregar nueva reacción
    this.reactions.push({ usuario: usuarioId, emoji });
  }

  return this.save();
};

// Método para marcar como leído
groupMessageSchema.methods.markAsRead = function (usuarioId) {
  const alreadyRead = this.readBy.find(r => r.usuario.equals(usuarioId));

  if (!alreadyRead) {
    this.readBy.push({ usuario: usuarioId, fecha: new Date() });
    return this.save();
  }

  return Promise.resolve(this);
};

// Método para destacar/quitar destacado
groupMessageSchema.methods.toggleStar = function (usuarioId) {
  const isStarred = this.starredBy.some(id => id.equals(usuarioId));

  if (isStarred) {
    this.starredBy = this.starredBy.filter(id => !id.equals(usuarioId));
  } else {
    this.starredBy.push(usuarioId);
  }

  return this.save();
};

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
