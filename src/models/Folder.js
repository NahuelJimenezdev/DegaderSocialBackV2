const mongoose = require('mongoose');

// Subesquema para archivos
const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimetype: { type: String, required: true },
  tipo: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio', 'pdf', 'document', 'spreadsheet', 'presentation', 'text', 'archive', 'file']
  },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// Esquema principal de carpetas
const folderSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true,
    maxlength: 500
  },
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    enum: ['personal', 'grupal', 'institucional'],
    default: 'personal',
    index: true
  },

  // Archivos contenidos
  archivos: [fileSchema],

  // Compartir con usuarios específicos
  compartidaCon: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permisos: {
      type: String,
      enum: ['lectura', 'escritura', 'admin'],
      default: 'lectura'
    },
    fechaCompartido: { type: Date, default: Date.now }
  }],

  // Sistema de visibilidad por cargo/rol
  visibilidadPorCargo: {
    habilitado: { type: Boolean, default: false },
    cargos: [{
      type: String,
      trim: true
    }]
  },

  // Visibilidad por área
  visibilidadPorArea: {
    habilitado: { type: Boolean, default: false },
    areas: [{
      type: String,
      trim: true
    }]
  },

  // Visibilidad geográfica
  visibilidadGeografica: {
    habilitado: { type: Boolean, default: false },
    pais: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    subdivision: { type: String, trim: true } // Estado/Provincia
  },

  // Metadatos
  color: {
    type: String,
    default: '#3B82F6' // Azul por defecto
  },
  icono: {
    type: String,
    default: 'folder'
  },
  tamaño: {
    type: Number,
    default: 0
  }, // en bytes
  cantidadArchivos: {
    type: Number,
    default: 0
  },
  ultimaActividad: {
    type: Date,
    default: Date.now,
    index: true
  },
  activa: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimización
folderSchema.index({ propietario: 1, tipo: 1, activa: 1 });
folderSchema.index({ nombre: 'text', descripcion: 'text' });
folderSchema.index({ 'compartidaCon.usuario': 1 });

// Virtual para formatear fecha
folderSchema.virtual('fechaCreacionFormateada').get(function() {
  return this.createdAt.toLocaleDateString('es-ES');
});

// Middleware para actualizar ultimaActividad y cantidadArchivos
folderSchema.pre('save', function(next) {
  if (this.isModified('archivos')) {
    this.cantidadArchivos = this.archivos.length;
    this.tamaño = this.archivos.reduce((total, file) => total + file.size, 0);
  }

  if (this.isModified() && !this.isModified('ultimaActividad')) {
    this.ultimaActividad = new Date();
  }

  next();
});

// Método para verificar permisos
folderSchema.methods.tienePermiso = async function(userId, accion = 'lectura') {
  const User = mongoose.model('User');

  // Obtener el ID del propietario
  const propietarioId = this.propietario._id ? this.propietario._id.toString() : this.propietario.toString();

  // El propietario siempre tiene todos los permisos
  if (propietarioId === userId.toString()) {
    return true;
  }

  // Verificar si está en compartidaCon
  const compartido = this.compartidaCon.find(item => {
    const usuarioId = item.usuario._id ? item.usuario._id.toString() : item.usuario.toString();
    return usuarioId === userId.toString();
  });

  if (compartido) {
    // Verificar permisos específicos
    switch (accion) {
      case 'lectura':
        return ['lectura', 'escritura', 'admin'].includes(compartido.permisos);
      case 'escritura':
        return ['escritura', 'admin'].includes(compartido.permisos);
      case 'admin':
        return compartido.permisos === 'admin';
      default:
        return false;
    }
  }

  // Si no está compartida explícitamente, verificar visibilidad automática (solo lectura)
  if (accion === 'lectura') {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // 1. Verificar visibilidad por cargo
      if (this.visibilidadPorCargo?.habilitado && this.visibilidadPorCargo?.cargos?.length > 0) {
        if (user.cargo && this.visibilidadPorCargo.cargos.includes(user.cargo)) {
          return true;
        }
      }

      // 2. Verificar visibilidad por área
      if (this.visibilidadPorArea?.habilitado && this.visibilidadPorArea?.areas?.length > 0) {
        if (user.area && this.visibilidadPorArea.areas.includes(user.area)) {
          return true;
        }
      }

      // 3. Verificar visibilidad geográfica
      if (this.visibilidadGeografica?.habilitado) {
        const userGeo = user.ubicacion;
        const carpetaGeo = this.visibilidadGeografica;

        let coincidencias = 0;
        let criterios = 0;

        if (carpetaGeo.pais) {
          criterios++;
          if (userGeo?.pais === carpetaGeo.pais) coincidencias++;
        }
        if (carpetaGeo.ciudad) {
          criterios++;
          if (userGeo?.ciudad === carpetaGeo.ciudad) coincidencias++;
        }
        if (carpetaGeo.subdivision) {
          criterios++;
          if (userGeo?.subdivision === carpetaGeo.subdivision) coincidencias++;
        }

        // Si coinciden todos los criterios definidos
        if (criterios > 0 && coincidencias === criterios) {
          return true;
        }
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
    }
  }

  return false;
};

// Método estático para obtener carpetas del usuario
folderSchema.statics.obtenerCarpetasUsuario = async function(userId, tipo = null) {
  const User = mongoose.model('User');

  // Obtener información del usuario
  let user = null;
  try {
    user = await User.findById(userId);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
  }

  const orConditions = [
    { propietario: userId },
    { 'compartidaCon.usuario': userId }
  ];

  // Si tenemos info del usuario, incluir carpetas con visibilidad automática
  if (user) {
    // Por cargo
    if (user.cargo) {
      orConditions.push({
        'visibilidadPorCargo.habilitado': true,
        'visibilidadPorCargo.cargos': user.cargo
      });
    }

    // Por área
    if (user.area) {
      orConditions.push({
        'visibilidadPorArea.habilitado': true,
        'visibilidadPorArea.areas': user.area
      });
    }

    // Por ubicación geográfica
    if (user.ubicacion) {
      const geoConditions = { 'visibilidadGeografica.habilitado': true };

      if (user.ubicacion.pais) {
        geoConditions['visibilidadGeografica.pais'] = user.ubicacion.pais;
      }
      if (user.ubicacion.ciudad) {
        geoConditions['visibilidadGeografica.ciudad'] = user.ubicacion.ciudad;
      }
      if (user.ubicacion.subdivision) {
        geoConditions['visibilidadGeografica.subdivision'] = user.ubicacion.subdivision;
      }

      if (Object.keys(geoConditions).length > 1) {
        orConditions.push(geoConditions);
      }
    }
  }

  const query = {
    $or: orConditions,
    activa: true
  };

  if (tipo) {
    query.tipo = tipo;
  }

  return this.find(query)
    .populate('propietario', 'nombre apellido email avatar cargo area')
    .populate('compartidaCon.usuario', 'nombre apellido email avatar')
    .sort({ ultimaActividad: -1 });
};

module.exports = mongoose.model('Folder', folderSchema);
