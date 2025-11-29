const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6,
    select: false // No incluir password en queries por defecto
  },
  legajo: {
    type: String,
    trim: true
  },
  area: {
    type: String,
    trim: true
  },
  cargo: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  biografia: {
    type: String,
    maxlength: 500,
    default: ''
  },
  fechaNacimiento: {
    type: Date
  },
  telefono: {
    type: String,
    trim: true
  },
  // ciudad: { type: String, trim: true }, // DEPRECATED: Usar ubicacion.ciudad
  ubicacion: {
    pais: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    subdivision: { type: String, trim: true }, // Estado/Provincia
    paisCode: { type: String, trim: true, default: 'AR' }
  },
  ministerio: {
    pastor: { type: String, trim: true },
    iglesiaNombre: { type: String, trim: true },
    denominacion: { type: String, trim: true },
    direccionMinisterio: { type: String, trim: true },
    rolMinisterio: { type: String, trim: true }
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'suspendido'],
    default: 'activo'
  },
  rol: {
    type: String,
    enum: ['usuario', 'admin', 'moderador'],
    default: 'usuario'
  },
  privacidad: {
    perfilPublico: { type: Boolean, default: true },
    mostrarEmail: { type: Boolean, default: false },
    mostrarTelefono: { type: Boolean, default: false },
    permitirMensajes: { type: Boolean, default: true }
  },
  ultimaConexion: {
    type: Date,
    default: Date.now
  },
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
userSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombre} ${this.apellido}`;
});

// Índices para búsquedas (email ya tiene índice por unique: true)
userSchema.index({ nombre: 1, apellido: 1 });
userSchema.index({ legajo: 1 });

module.exports = mongoose.model('User', userSchema);
