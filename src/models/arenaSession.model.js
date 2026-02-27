const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ArenaSessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'UserV2',
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['facil', 'medio', 'dificil', 'experto'],
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    xpEarned: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // Segundos
        required: true
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    endedAt: {
        type: Date,
        required: true,
        index: true
    },
    clientIp: {
        type: String
    },
    isSuspicious: {
        type: Boolean,
        default: false
    },
    bestStreak: {
        type: Number,
        default: 0
    },
    fastestAnswer: {
        type: Number, // Segundos
        default: 999
    }
}, {
    timestamps: true
});

module.exports = model('ArenaSession', ArenaSessionSchema);
