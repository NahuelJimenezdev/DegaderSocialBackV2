const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  emisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 2000
  },
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'archivo', 'video', 'audio'],
    default: 'texto'
  },
  archivo: {
    url: String,
    nombre: String,
    tipo: String,
    tamaño: Number
  },
  leido: {
    type: Boolean,
    default: false
  },
  fechaLeido: {
    type: Date
  }
}, {
  timestamps: true
});

const conversationSchema = new mongoose.Schema({
  participantes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  }],
  tipo: {
    type: String,
    enum: ['privada', 'grupo'],
    default: 'privada'
  },
  nombre: {
    type: String,
    trim: true
  },
  imagen: {
    type: String
  },
  mensajes: [messageSchema],
  ultimoMensaje: {
    contenido: String,
    fecha: Date,
    emisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    }
  },
  mensajesNoLeidos: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    cantidad: {
      type: Number,
      default: 0
    }
  }],
  activa: {
    type: Boolean,
    default: true
  },
  configuracion: {
    notificaciones: { type: Boolean, default: true },
    silenciada: { type: Boolean, default: false }
  },
  // Estado de solicitud de mensaje (para personas que no son amigas)
  messageRequestStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted'],
    default: 'none'
  },
  // Usuario que inició la conversación (para saber quién envió la solicitud)
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  },
  // Usuarios que archivaron esta conversación
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Usuarios que destacaron esta conversación (con estrella)
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Usuarios que eliminaron esta conversación (solo para ellos)
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Registro de cuando cada usuario vació la conversación
  clearedBy: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para contar mensajes
conversationSchema.virtual('totalMensajes').get(function () {
  return this.mensajes.length;
});

// Índices
conversationSchema.index({ participantes: 1 });
conversationSchema.index({ 'ultimoMensaje.fecha': -1 });

// Método para agregar mensaje
conversationSchema.methods.agregarMensaje = function (mensaje) {
  this.mensajes.push(mensaje);
  this.ultimoMensaje = {
    contenido: mensaje.contenido,
    fecha: new Date(),
    emisor: mensaje.emisor
  };

  // Actualizar mensajes no leídos para otros participantes
  this.participantes.forEach(participante => {
    if (!participante.equals(mensaje.emisor)) {
      const mensajesNoLeidos = this.mensajesNoLeidos.find(
        m => m.usuario.equals(participante)
      );
      if (mensajesNoLeidos) {
        mensajesNoLeidos.cantidad++;
      } else {
        this.mensajesNoLeidos.push({ usuario: participante, cantidad: 1 });
      }
    }
  });

  return this.save();
};

// Método para marcar mensajes como leídos
conversationSchema.methods.marcarComoLeido = function (usuarioId) {
  const mensajesNoLeidos = this.mensajesNoLeidos.find(
    m => m.usuario.equals(usuarioId)
  );
  if (mensajesNoLeidos) {
    mensajesNoLeidos.cantidad = 0;
  }

  // Marcar mensajes como leídos
  this.mensajes.forEach(mensaje => {
    if (!mensaje.emisor.equals(usuarioId) && !mensaje.leido) {
      mensaje.leido = true;
      mensaje.fechaLeido = new Date();
    }
  });

  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
