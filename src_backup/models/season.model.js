const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SeasonSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    seasonNumber: {
        type: Number,
        required: true,
        unique: true
    },
    startsAt: {
        type: Date,
        required: true
    },
    endsAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true
    },
    rewards: {
        top1: [{ type: String }], // IDs o nombres de items/insignias
        top10: [{ type: String }],
        top100: [{ type: String }],
        participation: [{ type: String }]
    },
    metadata: {
        theme: { type: String },
        description: { type: String }
    }
}, {
    timestamps: true
});

// Middleware para asegurar que solo haya una temporada activa (opcional)
SeasonSchema.pre('save', async function (next) {
    if (this.isActive) {
        await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
    }
    next();
});

module.exports = model('Season', SeasonSchema);
