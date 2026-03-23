const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  contenido: {
    type: String,
    maxlength: 2000
  },
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'archivo', 'video', 'audio'],
    default: 'texto'
  },
  archivo: {
    url: String,
    small: String,
    medium: String,
    large: String,
    blurHash: String,
    nombre: String,
    tipo: String,
    tamaño: Number
  },
  clientMessageId: {
    type: String,
    required: true,
    index: true
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  estado: {
    type: String,
    enum: ['enviado', 'entregado', 'leido'],
    default: 'enviado'
  },
  fechaEntregado: Date,
  fechaLeido: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Índice único compuesto para IDEMPOTENCIA ESTRICTA
// Evita duplicados si el cliente reintenta la misma petición por fallos de red
messageSchema.index({ conversationId: 1, clientMessageId: 1 }, { unique: true });

// Índice compuesto para PAGINACIÓN SEGURA (Cursor-based)
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Message', messageSchema);
