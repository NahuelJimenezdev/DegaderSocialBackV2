const { Schema, model } = require('mongoose');

const carpetaSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String
  },
  propietario: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  carpetaPadre: {
    type: Schema.Types.ObjectId,
    ref: 'Carpeta'
  },
  archivos: [{
    nombre: String,
    nombreOriginal: String,
    url: String,
    tipo: String,
    tamaño: Number,
    fechaSubida: {
      type: Date,
      default: Date.now
    }
  }],
  compartidaCon: [{
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    permisos: {
      type: String,
      enum: ['lectura', 'escritura', 'admin'],
      default: 'lectura'
    }
  }],
  color: {
    type: String,
    default: '#3b82f6'
  },
  icono: {
    type: String
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
carpetaSchema.index({ propietario: 1, carpetaPadre: 1 });

module.exports = model('Carpeta', carpetaSchema);
