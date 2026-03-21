const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const IglesiaTestimonialSchema = new Schema({
    iglesia: {
        type: Schema.Types.ObjectId,
        ref: 'Iglesia',
        required: true,
        index: true
    },
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'UserV2',
        required: true
    },
    mensaje: {
        type: String,
        required: [true, 'El mensaje es obligatorio'],
        trim: true,
        maxlength: [500, 'El mensaje no puede exceder 500 caracteres']
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índice compuesto para asegurar un solo testimonio activo por usuario por iglesia
IglesiaTestimonialSchema.index({ iglesia: 1, usuario: 1 }, { unique: true });

module.exports = model('IglesiaTestimonial', IglesiaTestimonialSchema);
