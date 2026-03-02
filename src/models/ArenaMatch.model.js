const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ArenaMatchSchema = new Schema({
  mode: {
    type: String,
    enum: ['tower', 'arena', 'territory'],
    required: true,
    default: 'arena'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending' // pending -> buscando oponente. active -> jugando.
  },
  player1: { type: Schema.Types.ObjectId, ref: 'UserV2', required: true },
  player2: { type: Schema.Types.ObjectId, ref: 'UserV2' },

  // Estado del juego en curso
  gameState: {
    // Para modo "Arena Competitiva" (Tug-of-war horizontal)
    dominationTotal: { type: Number, default: 100 },
    currentDomination: { type: Number, default: 50 }, // 50 es el centro. >50 favorece a P1, <50 favorece a P2.

    // Stats de la partida
    player1Health: { type: Number, default: 3 },
    player2Health: { type: Number, default: 3 },
    player1Streak: { type: Number, default: 0 },
    player2Streak: { type: Number, default: 0 },

    // Para modo "Torre"
    player1Floor: { type: Number, default: 1 },
    player2Floor: { type: Number, default: 1 },

    // Pregunta actual en disputa (Si se leen de JSON estático desde el frontend, guardamos el ID o un hash)
    currentRoundNum: { type: Number, default: 1 },
    currentQuestionCategoryId: { type: String },
    currentQuestionDifficulty: { type: String },
    currentQuestionId: { type: String } // Referencia al ID local de la pregunta en el JSON para que ambos frontends abran la misma
  },

  winner: { type: Schema.Types.ObjectId, ref: 'UserV2' },

  // Historial de la partida asincrono o sincrono
  history: [{
    roundNum: Number,
    questionId: String,
    player1Answer: String,
    player1TimeMs: Number,
    player1Correct: Boolean,
    player2Answer: String,
    player2TimeMs: Number,
    player2Correct: Boolean
  }],

  // Recompensas calculadas al finalizar
  rewards: {
    winnerPG: { type: Number, default: 0 },
    loserPG: { type: Number, default: 0 }
  }

}, { timestamps: true });

// Índices para búsquedas eficientes (ej. "Encontrar partida pendiente para Matchmaking")
ArenaMatchSchema.index({ player1: 1, status: 1 });
ArenaMatchSchema.index({ player2: 1, status: 1 });
ArenaMatchSchema.index({ status: 1, mode: 1 });

const ArenaMatch = model('ArenaMatch', ArenaMatchSchema);

module.exports = ArenaMatch;
