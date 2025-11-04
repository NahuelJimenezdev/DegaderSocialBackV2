const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // No incluir password por defecto en queries
  },
  avatar: {
    type: String,
    default: null
  },
  biografia: {
    type: String,
    default: '',
    maxlength: 500
  },
  fechaNacimiento: {
    type: Date
  },
  rol: {
    type: String,
    enum: ['usuario', 'administrador', 'moderador'],
    default: 'usuario'
  },
  verificado: {
    type: Boolean,
    default: false
  },
  activo: {
    type: Boolean,
    default: true
  },
  // Campos institucionales
  legajo: {
    type: String,
    unique: true,
    sparse: true
  },
  area: {
    type: Schema.Types.ObjectId,
    ref: 'Area'
  },
  cargo: {
    type: String
  },
  // Configuración de privacidad
  privacidad: {
    perfilPublico: { type: Boolean, default: true },
    mostrarEmail: { type: Boolean, default: false },
    mostrarFechaNacimiento: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices para búsquedas optimizadas
userSchema.index({ email: 1 });
userSchema.index({ nombre: 'text', apellido: 'text' });

// Método para obtener datos públicos del usuario
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    nombre: this.nombre,
    apellido: this.apellido,
    avatar: this.avatar,
    biografia: this.biografia,
    verificado: this.verificado
  };
};

module.exports = model('User', userSchema);
