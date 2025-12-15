const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Modelo de Impresión de Anuncio (AdImpression)
 * Registra cada vez que un anuncio es visto por un usuario
 * Usado para métricas, evitar repetición y análisis
 */
const AdImpressionSchema = new Schema({
  // ==========================================
  // IDENTIFICACIÓN
  // ==========================================
  anuncioId: {
    type: Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    index: true
  },

  usuarioId: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },

  // ==========================================
  // TIPO DE INTERACCIÓN
  // ==========================================
  tipo: {
    type: String,
    enum: ['vista', 'click'],
    default: 'vista',
    required: true
  },

  // ==========================================
  // METADATA PARA ANÁLISIS
  // ==========================================
  dispositivo: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown'
  },
  navegador: { type: String },
  sistemaOperativo: { type: String },

  // Ubicación del usuario al momento de ver el anuncio (OPCIONAL)
  ubicacion: {
    ciudad: { type: String, required: false },
    pais: { type: String, required: false },
    coordenadas: {
      type: {
        type: String,
        enum: ['Point'],
        required: false
      },
      coordinates: {
        type: [Number],
        required: false
      }
    }
  },

  // ==========================================
  // CONTEXTO
  // ==========================================
  paginaOrigen: { type: String }, // URL donde se mostró el anuncio
  seccionSidebar: { type: String, default: 'AdsSidebar' },

  // ==========================================
  // TIMESTAMPS
  // ==========================================
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// ==========================================
// ÍNDICES
// ==========================================
// Índice compuesto para evitar contar la misma impresión múltiples veces
// y para consultas rápidas de "cuántas veces vio este usuario este anuncio"
AdImpressionSchema.index({ anuncioId: 1, usuarioId: 1, timestamp: 1 });

// Índice para análisis temporal
AdImpressionSchema.index({ anuncioId: 1, timestamp: -1 });

// Índice geoespacial para análisis de ubicación
AdImpressionSchema.index({ 'ubicacion.coordenadas': '2dsphere' });

// ==========================================
// MÉTODOS ESTÁTICOS
// ==========================================
/**
 * Registrar una impresión (vista)
 */
AdImpressionSchema.statics.registrarVista = async function (data) {
  const impresion = await this.create({
    anuncioId: data.anuncioId,
    usuarioId: data.usuarioId,
    tipo: 'vista',
    dispositivo: data.dispositivo,
    navegador: data.navegador,
    sistemaOperativo: data.sistemaOperativo,
    ubicacion: data.ubicacion,
    paginaOrigen: data.paginaOrigen
  });

  // Actualizar contador en el modelo Ad
  const Ad = mongoose.model('Ad');
  await Ad.findByIdAndUpdate(data.anuncioId, {
    $inc: { 'metricas.impresiones': 1 }
  });

  return impresion;
};

/**
 * Registrar un click
 */
AdImpressionSchema.statics.registrarClick = async function (data) {
  const impresion = await this.create({
    anuncioId: data.anuncioId,
    usuarioId: data.usuarioId,
    tipo: 'click',
    dispositivo: data.dispositivo,
    navegador: data.navegador,
    sistemaOperativo: data.sistemaOperativo,
    ubicacion: data.ubicacion,
    paginaOrigen: data.paginaOrigen
  });

  // Actualizar contador en el modelo Ad
  const Ad = mongoose.model('Ad');
  await Ad.findByIdAndUpdate(data.anuncioId, {
    $inc: { 'metricas.clicks': 1 }
  });

  return impresion;
};

/**
 * Contar cuántas veces un usuario ha visto un anuncio específico
 */
AdImpressionSchema.statics.contarVistasUsuario = function (anuncioId, usuarioId) {
  return this.countDocuments({
    anuncioId,
    usuarioId,
    tipo: 'vista'
  });
};

/**
 * Verificar si el usuario ya vio este anuncio recientemente (últimas 24h)
 */
AdImpressionSchema.statics.vioRecientemente = async function (anuncioId, usuarioId, horas = 24) {
  const hace24h = new Date(Date.now() - horas * 60 * 60 * 1000);
  const count = await this.countDocuments({
    anuncioId,
    usuarioId,
    tipo: 'vista',
    timestamp: { $gte: hace24h }
  });
  return count > 0;
};

/**
 * Obtener estadísticas de un anuncio
 */
AdImpressionSchema.statics.obtenerEstadisticas = async function (anuncioId, fechaInicio, fechaFin) {
  const match = { anuncioId: new mongoose.Types.ObjectId(anuncioId) };

  if (fechaInicio && fechaFin) {
    match.timestamp = { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$tipo',
        total: { $sum: 1 },
        usuariosUnicos: { $addToSet: '$usuarioId' }
      }
    }
  ]);

  const resultado = {
    vistas: 0,
    clicks: 0,
    usuariosUnicosVistas: 0,
    usuariosUnicosClicks: 0,
    ctr: 0
  };

  stats.forEach(item => {
    if (item._id === 'vista') {
      resultado.vistas = item.total;
      resultado.usuariosUnicosVistas = item.usuariosUnicos.length;
    }
    if (item._id === 'click') {
      resultado.clicks = item.total;
      resultado.usuariosUnicosClicks = item.usuariosUnicos.length;
    }
  });

  if (resultado.vistas > 0) {
    resultado.ctr = (resultado.clicks / resultado.vistas) * 100;
  }

  return resultado;
};

/**
 * Obtener distribución geográfica de impresiones
 */
AdImpressionSchema.statics.obtenerDistribucionGeografica = function (anuncioId) {
  return this.aggregate([
    { $match: { anuncioId: new mongoose.Types.ObjectId(anuncioId) } },
    {
      $group: {
        _id: {
          pais: '$ubicacion.pais',
          ciudad: '$ubicacion.ciudad'
        },
        total: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = mongoose.model('AdImpression', AdImpressionSchema);
