const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const IglesiaSchema = new Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la iglesia es obligatorio'],
    trim: true
  },
  denominacion: {
    type: String,
    trim: true,
    default: 'Interdenominacional'
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Ubicación
  ubicacion: {
    pais: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    coordenadas: {
      lat: Number,
      lng: Number
    },
    googleMapsLink: { type: String, trim: true } // Link directo de Google Maps
  },

  // Contacto
  contacto: {
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
    sitioWeb: { type: String, trim: true }
  },

  // Liderazgo
  pastorPrincipal: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true
  },

  // Membresía
  miembros: [{
    type: Schema.Types.ObjectId,
    ref: 'UserV2'
  }],

  // Solicitudes de ingreso pendientes
  solicitudes: [{
    usuario: { type: Schema.Types.ObjectId, ref: 'UserV2' },
    fecha: { type: Date, default: Date.now },
    mensaje: String
  }],

  // Historial de miembros que salieron
  historialSalidas: [{
    usuario: { type: Schema.Types.ObjectId, ref: 'UserV2' },
    fechaSalida: { type: Date, default: Date.now },
    motivo: String,
    rolAlSalir: String, // Rol que tenía al momento de salir
    fechaUnion: Date, // Cuándo se unió
    tiempoMembresia: String, // Texto legible: "2 años, 3 meses"
    historialRoles: [{
      rol: String,
      fechaInicio: Date,
      fechaFin: Date
    }]
  }],

  // Horarios / Reuniones
  reuniones: [{
    nombre: String, // Ej: Culto General, Jóvenes
    dia: { type: String, enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
    hora: String
  }],

  // Horarios simplificados (para el formulario de configuración)
  horarios: [{
    dia: String,
    hora: String,
    tipo: String // Oración, Estudio de la Palabra, Culto General, Escuela Dominical
  }],

  // Misión, Visión, Valores
  mision: { type: String, trim: true },
  vision: { type: String, trim: true },
  valores: { type: String, trim: true },

  // Información Pastoral Personalizada
  infoPastor: {
    mensaje: { type: String, trim: true, maxlength: 500 }
  },

  logo: { type: String },
  portada: { type: String },
  galeria: [{ type: String }],

  multimedia: [{
    url: { type: String, required: true },
    tipo: { type: String, enum: ['image', 'video'], required: true },
    caption: String,
    fecha: { type: Date, default: Date.now }
  }],

  activo: {
    type: Boolean,
    default: true
  },

  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
IglesiaSchema.index({ 'ubicacion.ciudad': 1, 'ubicacion.pais': 1 });
IglesiaSchema.index({ nombre: 'text' });
IglesiaSchema.index({ pastorPrincipal: 1 });

const Iglesia = model('Iglesia', IglesiaSchema);

// Registrar alias 'Ministerio' apuntando a la misma colección (para notificaciones que referencian ministerios)
try {
  model('Ministerio');
} catch (error) {
  model('Ministerio', IglesiaSchema, Iglesia.collection.name);
}

module.exports = Iglesia;
