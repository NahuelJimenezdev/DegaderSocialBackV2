const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SeasonSnapshotSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'UserV2',
        required: true,
        index: true
    },
    seasonId: {
        type: Schema.Types.ObjectId,
        ref: 'Season',
        required: true,
        index: true
    },
    finalRank: { type: Number },
    finalLeague: { type: String },
    finalPoints: { type: Number },
    rewardsGiven: [{
        itemId: String,
        amount: Number,
        grantedAt: Date
    }],
    snapshotAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = model('SeasonSnapshot', SeasonSnapshotSchema);
