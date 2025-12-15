const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Modelo de Transacción de Créditos (CreditTransaction)
 * Registra el historial completo de compras y gastos de créditos
 */
const CreditTransactionSchema = new Schema({
  // ==========================================
  // IDENTIFICACIÓN
  // ==========================================
  clienteId: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },

  // ==========================================
  // TIPO DE TRANSACCIÓN
  // ==========================================
  tipo: {
    type: String,
    enum: ['compra', 'gasto', 'bono', 'reembolso', 'ajuste'],
    required: true,
    index: true
  },

  // ==========================================
  // MONTOS
  // ==========================================
  cantidad: {
    type: Number,
    required: true
  }, // Positivo para compra/bono, negativo para gasto

  balanceAnterior: { type: Number, required: true },
  balanceNuevo: { type: Number, required: true },

  // ==========================================
  // INFORMACIÓN DE COMPRA (si tipo === 'compra')
  // ==========================================
  montoPagado: { type: Number }, // En USD o tu moneda
  moneda: { type: String, default: 'USD' },
  metodoPago: {
    type: String,
    enum: ['stripe', 'paypal', 'transferencia', 'efectivo', 'otro']
  },
  transaccionPagoId: { type: String }, // ID de Stripe/PayPal
  paquete: {
    type: String,
    enum: ['basico', 'premium', 'empresarial', 'personalizado']
  },

  // ==========================================
  // INFORMACIÓN DE GASTO (si tipo === 'gasto')
  // ==========================================
  anuncioId: {
    type: Schema.Types.ObjectId,
    ref: 'Ad'
  },
  impresionesGeneradas: { type: Number }, // Cuántas impresiones se pagaron con estos créditos

  // ==========================================
  // INFORMACIÓN DE BONO (si tipo === 'bono')
  // ==========================================
  motivoBono: {
    type: String,
    enum: ['bienvenida', 'promocion', 'referido', 'compensacion', 'otro']
  },

  // ==========================================
  // METADATA
  // ==========================================
  descripcion: { type: String, trim: true },
  notas: { type: String, trim: true }, // Notas internas (solo admin)

  // IP y dispositivo (para auditoría)
  ip: { type: String },
  userAgent: { type: String },

  // ==========================================
  // TIMESTAMPS
  // ==========================================
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Solo createdAt, no updatedAt
});

// ==========================================
// ÍNDICES
// ==========================================
CreditTransactionSchema.index({ clienteId: 1, createdAt: -1 });
CreditTransactionSchema.index({ tipo: 1, createdAt: -1 });
CreditTransactionSchema.index({ anuncioId: 1 });

// ==========================================
// MÉTODOS ESTÁTICOS
// ==========================================
/**
 * Obtener historial de un cliente
 */
CreditTransactionSchema.statics.obtenerHistorial = function (clienteId, limite = 50) {
  return this.find({ clienteId })
    .sort({ createdAt: -1 })
    .limit(limite)
    .populate('anuncioId', 'nombreCliente imagenUrl');
};

/**
 * Obtener total de ingresos (para founder dashboard)
 */
CreditTransactionSchema.statics.obtenerIngresostotales = async function () {
  const resultado = await this.aggregate([
    { $match: { tipo: 'compra' } },
    {
      $group: {
        _id: null,
        totalIngresos: { $sum: '$montoPagado' },
        totalTransacciones: { $sum: 1 }
      }
    }
  ]);
  return resultado[0] || { totalIngresos: 0, totalTransacciones: 0 };
};

/**
 * Obtener estadísticas de un cliente
 */
CreditTransactionSchema.statics.obtenerEstadisticasCliente = async function (clienteId) {
  const resultado = await this.aggregate([
    { $match: { clienteId: new mongoose.Types.ObjectId(clienteId) } },
    {
      $group: {
        _id: '$tipo',
        total: { $sum: '$cantidad' },
        count: { $sum: 1 }
      }
    }
  ]);

  const stats = {
    compras: 0,
    gastos: 0,
    bonos: 0,
    transacciones: resultado.length
  };

  resultado.forEach(item => {
    if (item._id === 'compra') stats.compras = item.total;
    if (item._id === 'gasto') stats.gastos = Math.abs(item.total);
    if (item._id === 'bono') stats.bonos = item.total;
  });

  return stats;
};

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);
