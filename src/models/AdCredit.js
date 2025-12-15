const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Modelo de Créditos Publicitarios (AdCredit)
 * Gestiona el balance de DegaCoins de cada cliente anunciante
 */
const AdCreditSchema = new Schema({
  // ==========================================
  // IDENTIFICACIÓN DEL CLIENTE
  // ==========================================
  clienteId: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    unique: true, // Un solo balance por cliente
    index: true
  },

  // ==========================================
  // BALANCE DE CRÉDITOS
  // ==========================================
  balance: {
    type: Number,
    default: 0,
    min: 0
  }, // DegaCoins disponibles

  // ==========================================
  // ESTADÍSTICAS HISTÓRICAS
  // ==========================================
  totalComprado: { type: Number, default: 0 }, // Total histórico comprado
  totalGastado: { type: Number, default: 0 }, // Total histórico gastado
  totalBonos: { type: Number, default: 0 }, // Total de bonos recibidos

  // ==========================================
  // METADATA
  // ==========================================
  ultimaRecarga: { type: Date },
  ultimoGasto: { type: Date },

  // Alertas
  alertaBajoBalance: { type: Boolean, default: false }, // Se activa cuando balance < 100
  umbralAlerta: { type: Number, default: 100 }, // Créditos mínimos antes de alertar

  // ==========================================
  // TIMESTAMPS
  // ==========================================
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ==========================================
// MIDDLEWARES
// ==========================================
AdCreditSchema.pre('save', function (next) {
  // Activar alerta si el balance es bajo
  this.alertaBajoBalance = this.balance < this.umbralAlerta;
  this.updatedAt = Date.now();
  next();
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================
/**
 * Agregar créditos (compra o bono)
 */
AdCreditSchema.methods.agregarCreditos = function (cantidad, esBono = false) {
  this.balance += cantidad;
  this.totalComprado += esBono ? 0 : cantidad;
  this.totalBonos += esBono ? cantidad : 0;
  this.ultimaRecarga = Date.now();
  return this.save();
};

/**
 * Descontar créditos (gasto por impresión)
 */
AdCreditSchema.methods.descontarCreditos = function (cantidad) {
  if (this.balance < cantidad) {
    throw new Error('Balance insuficiente');
  }
  this.balance -= cantidad;
  this.totalGastado += cantidad;
  this.ultimoGasto = Date.now();
  return this.save();
};

/**
 * Verificar si tiene créditos suficientes
 */
AdCreditSchema.methods.tieneSuficientes = function (cantidad) {
  return this.balance >= cantidad;
};

// ==========================================
// MÉTODOS ESTÁTICOS
// ==========================================
/**
 * Obtener o crear balance para un cliente
 */
AdCreditSchema.statics.obtenerOCrear = async function (clienteId) {
  let balance = await this.findOne({ clienteId });
  if (!balance) {
    balance = await this.create({ clienteId });
  }
  return balance;
};

/**
 * Obtener clientes con balance bajo
 */
AdCreditSchema.statics.clientesConBalanceBajo = function () {
  return this.find({ alertaBajoBalance: true });
};

module.exports = mongoose.model('AdCredit', AdCreditSchema);
