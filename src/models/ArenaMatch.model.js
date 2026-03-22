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

    // Pregunta actual en disputa y caché de preguntas reales de la partida
    currentRoundNum: { type: Number, default: 1 },
    questions: [{
      _id: { type: Schema.Types.ObjectId, ref: 'Challenge' },
      question: String,
      options: [{ id: String, text: String }],
      correctAnswer: String,
      xpReward: Number
    }],
    currentQuestionId: { type: Schema.Types.ObjectId, ref: 'Challenge' }
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
