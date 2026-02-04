const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del grupo es obligatorio'],
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  imagen: {
    type: String,
    default: null
  },
  tipo: {
    type: String,
    enum: ['publico', 'privado', 'secreto'],
    default: 'publico'
  },
  categoria: {
    type: String,
    enum: ['General', 'Deportes', 'Tecnología', 'Arte', 'Música', 'Educación', 'Negocios', 'Otro'],
    default: 'General'
  },
  creador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },
  administradores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  moderadores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  miembros: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fechaUnion: {
      type: Date,
      default: Date.now
    },
    rol: {
      type: String,
      enum: ['miembro', 'moderador', 'administrador'],
      default: 'miembro'
    },
    // Configuración de notificaciones por miembro
    notificaciones: {
      silenciadas: {
        type: Boolean,
        default: false
      },
      tipoSilencio: {
        type: String,
        enum: ['total', 'solo_menciones'],
        default: 'total'
      },
      silenciadoHasta: {
        type: Date,
        default: null // null = siempre silenciado
      },
      duracionSilencio: {
        type: String,
        enum: ['1h', '8h', '24h', 'siempre'],
        default: 'siempre'
      }
    }
  }],
  solicitudesPendientes: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserV2'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  reglas: [{
    titulo: String,
    descripcion: String
  }],
  configuracion: {
    permitirPublicaciones: { type: Boolean, default: true },
    requiereAprobacion: { type: Boolean, default: false },
    notificaciones: { type: Boolean, default: true }
  },
  estadisticas: {
    totalPublicaciones: { type: Number, default: 0 },
    publicacionesEsteMes: { type: Number, default: 0 },
    totalMensajes: { type: Number, default: 0 },
    totalArchivos: { type: Number, default: 0 },
    nivelActividad: { type: Number, default: 0, min: 0, max: 100 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para contar miembros
groupSchema.virtual('totalMiembros').get(function () {
  return this.miembros ? this.miembros.length : 0;
});

// Índices
groupSchema.index({ nombre: 'text', descripcion: 'text' });
groupSchema.index({ tipo: 1, categoria: 1 });
groupSchema.index({ creador: 1 });

module.exports = mongoose.model('Group', groupSchema);
