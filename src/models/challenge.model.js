const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ChallengeSchema = new Schema({
    level: {
        type: String,
        enum: ['facil', 'medio', 'dificil', 'experto'],
        required: true,
        index: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [{
        id: { type: String, required: true },
        text: { type: String, required: true }
    }],
    correctAnswer: {
        type: String,
        required: true
    },
    xpReward: {
        type: Number,
        required: true,
        default: 10
    },
    difficultyMultiplier: {
        type: Number,
        required: true,
        default: 1
    },
    metadata: {
        category: { type: String, default: 'general' },
        active: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

module.exports = model('Challenge', ChallengeSchema);
