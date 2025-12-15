const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Modelo de Anuncio (Ad)
 * Representa una campaña publicitaria con segmentación avanzada
 */
const AdSchema = new Schema({
  // ==========================================
  // INFORMACIÓN DEL CLIENTE
  // ==========================================
  clienteId: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },
  nombreCliente: { type: String, required: true, trim: true },

  // ==========================================
  // CONTENIDO DEL ANUNCIO
  // ==========================================
  imagenUrl: { type: String, required: true },
  linkDestino: { type: String, required: true },
  textoAlternativo: { type: String, trim: true },
  callToAction: { type: String, default: 'Ver más', trim: true },

  // ==========================================
  // ESTADO DE LA CAMPAÑA
  // ==========================================
  estado: {
    type: String,
    enum: ['borrador', 'pendiente_aprobacion', 'activo', 'pausado', 'finalizado', 'sin_creditos', 'rechazado'],
    default: 'borrador',
    index: true
  },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },

  // Razón de rechazo (si aplica)
  motivoRechazo: { type: String, trim: true },

  // ==========================================
  // SEGMENTACIÓN (TARGETING)
  // ==========================================
  segmentacion: {
    // Edad
    edadMin: { type: Number, default: 13, min: 13, max: 100 },
    edadMax: { type: Number, default: 65, min: 13, max: 100 },

    // Género
    genero: {
      type: String,
      enum: ['todos', 'M', 'F', 'Otro'],
      default: 'todos'
    },

    // Intereses (tags)
    intereses: [{ type: String, trim: true }], // ['religión', 'lectura', 'tecnología']

    // Geolocalización (opcional - solo para campañas con targeting geográfico)
    ubicacion: {
      type: { type: String, required: false },
      coordinates: { type: [Number], required: false },
      radioKm: { type: Number, min: 1, max: 500, required: false },
      esGlobal: { type: Boolean, required: false }
    }
  },

  // ==========================================
  // SISTEMA DE PRIORIDAD
  // ==========================================
  prioridad: {
    type: String,
    enum: ['basica', 'premium', 'destacada'],
    default: 'basica'
  },

  // ==========================================
  // CONTROL DE FRECUENCIA
  // ==========================================
  maxImpresionesUsuario: {
    type: Number,
    default: 3,  // Valor estándar de la industria
    min: 1,
    max: 100     // Límite razonable para casos especiales
  }, // Máx veces que un usuario ve este anuncio

  // ==========================================
  // MÉTRICAS
  // ==========================================
  metricas: {
    impresiones: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }, // Click-Through Rate (calculado)
    usuariosUnicos: { type: Number, default: 0 }
  },

  // ==========================================
  // SISTEMA DE CRÉDITOS
  // ==========================================
  creditosGastados: { type: Number, default: 0 },
  costoPorImpresion: { type: Number, default: 1 }, // 1 DegaCoin por impresión

  // ==========================================
  // TIMESTAMPS
  // ==========================================
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ==========================================
// ÍNDICES
// ==========================================
// Índice geoespacial para búsquedas por ubicación
AdSchema.index({ 'segmentacion.ubicacion': '2dsphere' });

// Índice compuesto para búsquedas eficientes
AdSchema.index({ estado: 1, fechaInicio: 1, fechaFin: 1 });
AdSchema.index({ clienteId: 1, estado: 1 });

// ==========================================
// MIDDLEWARES
// ==========================================
// Calcular CTR antes de guardar
AdSchema.pre('save', function (next) {
  if (this.metricas.impresiones > 0) {
    this.metricas.ctr = (this.metricas.clicks / this.metricas.impresiones) * 100;
  }
  this.updatedAt = Date.now();
  next();
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================
AdSchema.methods.estaActivo = function () {
  const now = new Date();
  return this.estado === 'activo' &&
    this.fechaInicio <= now &&
    this.fechaFin >= now;
};

AdSchema.methods.puedeSerMostrado = function (usuario) {
  if (!this.estaActivo()) return false;

  // Verificar edad
  if (usuario.personal?.fechaNacimiento) {
    const edad = Math.floor((Date.now() - usuario.personal.fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));
    if (edad < this.segmentacion.edadMin || edad > this.segmentacion.edadMax) {
      return false;
    }
  }

  // Verificar género
  if (this.segmentacion.genero !== 'todos' &&
    usuario.personal?.genero !== this.segmentacion.genero) {
    return false;
  }

  return true;
};

// ==========================================
// MÉTODOS ESTÁTICOS
// ==========================================
AdSchema.statics.obtenerAnunciosActivos = function () {
  const now = new Date();
  return this.find({
    estado: 'activo',
    fechaInicio: { $lte: now },
    fechaFin: { $gte: now }
  });
};

module.exports = mongoose.model('Ad', AdSchema);
