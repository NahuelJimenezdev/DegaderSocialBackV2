const { Schema, model } = require('mongoose');

const groupFolderSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String
  },
  grupo: {
    type: Schema.Types.ObjectId,
    ref: 'Grupo',
    required: true
  },
  creador: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  archivos: [{
    nombre: String,
    url: String,
    tipo: String,
    tamaño: Number,
    subidoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    fechaSubida: {
      type: Date,
      default: Date.now
    }
  }],
  permisos: {
    lectura: {
      type: String,
      enum: ['todos', 'miembros', 'admin'],
      default: 'miembros'
    },
    escritura: {
      type: String,
      enum: ['todos', 'miembros', 'admin'],
      default: 'miembros'
    }
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
groupFolderSchema.index({ grupo: 1 });

module.exports = model('GroupFolder', groupFolderSchema);
