const mongoose = require('mongoose');

const ChurchEventSchema = new mongoose.Schema({
    iglesia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Iglesia',
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserV2',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    dates: [{
        type: Date,
        required: true
    }],
    time: {
        type: String, // Texto libre "10:00 AM - 2:00 PM"
        required: true
    },
    location: {
        provincia: { type: String, trim: true },
        ciudad: { type: String, trim: true },
        localidad: { type: String, trim: true },
        direccion: { type: String, trim: true, required: true }
    },
    guest: {
        type: String, // "Invitado Especial: Juan Perez"
        trim: true
    },
    audience: {
        type: String, // "Jóvenes", "Matrimonios", "General"
        default: 'General'
    },

    // Interactions
    attendees: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2' },
        date: { type: Date, default: Date.now }
    }],

    reminders: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2' },
        date: { type: Date, default: Date.now }
    }],

    notInterested: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserV2'
    }]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

ChurchEventSchema.virtual('stats').get(function () {
    return {
        attendeesCount: this.attendees.length,
        remindersCount: this.reminders.length,
        notInterestedCount: this.notInterested.length
    };
});

module.exports = mongoose.model('ChurchEvent', ChurchEventSchema);
